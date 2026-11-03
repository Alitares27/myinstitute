package com.gestionar.institute.nativeplugins;

import android.app.job.JobParameters;
import android.app.job.JobService;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class OfflineSyncJobService extends JobService {
    private static final String TAG = "GestionARSync";
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    private static final class HttpResult {
        final int status;
        final String body;

        HttpResult(int status, String body) {
            this.status = status;
            this.body = body;
        }
    }

    @Override
    public boolean onStartJob(JobParameters parameters) {
        EXECUTOR.execute(() -> {
            boolean retry = syncQueue();
            jobFinished(parameters, retry);
        });
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters parameters) {
        return true;
    }

    private boolean syncQueue() {
        SharedPreferences prefs = OfflineQueueStore.preferences(this);
        String userId = prefs.getString("activeUserId", "");
        String token = prefs.getString("token", "");
        String apiBase = prefs.getString("apiBase", "");
        if (userId.isEmpty() || token.isEmpty() || apiBase.isEmpty()) return false;

        synchronized (OfflineQueueStore.class) {
            JSONArray queue = OfflineQueueStore.readQueue(this);
            for (int index = 0; index < queue.length(); index++) {
                JSONObject entry = queue.optJSONObject(index);
                if (entry == null || !userId.equals(entry.optString("userId"))) continue;
                try {
                    HttpResult http = send(entry, apiBase, token);
                    int status = http.status;
                    if (status < 200 || status >= 300) {
                        String error = readError(status, http.body);
                        entry.put("lastError", error);
                        queue.put(index, entry);
                        OfflineQueueStore.writeQueue(this, queue);
                        return status == 429 || status >= 500;
                    }

                    JSONObject result;
                    try { result = new JSONObject(http.body); }
                    catch (JSONException ignored) { result = new JSONObject(); }
                    long localId = entry.optLong("localId", 0);
                    Object serverId = result.has("id") ? result.opt("id") : result.optJSONObject("user") != null ? result.optJSONObject("user").opt("id") : null;
                    if (localId < 0 && serverId != null && serverId != JSONObject.NULL) {
                        storeMapping(userId, localId, serverId);
                        applyMapping(queue, index, localId, serverId);
                    }
                    queue.remove(index);
                    index--;
                    OfflineQueueStore.writeQueue(this, queue);
                } catch (Exception error) {
                    Log.w(TAG, "Se reintentará la sincronización local", error);
                    try { entry.put("lastError", "Sin conexión con el servidor; se reintentará automáticamente."); } catch (JSONException ignored) {}
                    OfflineQueueStore.writeQueue(this, queue);
                    return true;
                }
            }
        }
        return false;
    }

    private HttpResult send(JSONObject entry, String apiBase, String token) throws Exception {
        String endpoint = apiBase.replaceAll("/+$", "") + entry.getString("url");
        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setRequestMethod(entry.optString("method", "POST"));
        connection.setConnectTimeout(20_000);
        connection.setReadTimeout(20_000);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setRequestProperty("X-Offline-Queue-Id", entry.optString("id"));
        Object body = entry.opt("data");
        if (body != null && body != JSONObject.NULL && !"DELETE".equals(entry.optString("method"))) {
            connection.setDoOutput(true);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }
        }
        int status = connection.getResponseCode();
        InputStream input = status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream();
        String responseBody = input == null ? "" : readAll(input);
        connection.disconnect();
        return new HttpResult(status, responseBody);
    }

    private String readAll(InputStream input) throws Exception {
        try (InputStream stream = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int length;
            while ((length = stream.read(buffer)) != -1) output.write(buffer, 0, length);
            return output.toString("UTF-8");
        }
    }

    private String readError(int status, String body) {
        try {
            String message = new JSONObject(body).optString("message", "");
            if (!message.isEmpty()) return message;
        } catch (JSONException ignored) {}
        if (status == 401) return "La sesión caducó. Inicia sesión para sincronizar este cambio.";
        if (status == 403) return "La cuenta ya no tiene permiso para sincronizar este cambio.";
        if (status == 409) return "El servidor detectó un conflicto. El cambio se conserva en este dispositivo.";
        return "El servidor rechazó el cambio (HTTP " + status + "). Se conserva en este dispositivo.";
    }

    private void storeMapping(String userId, long localId, Object serverId) throws JSONException {
        SharedPreferences prefs = OfflineQueueStore.preferences(this);
        JSONArray mappings = new JSONArray(prefs.getString("idMappings", "[]"));
        JSONObject mapping = new JSONObject();
        mapping.put("userId", userId);
        mapping.put("localId", localId);
        mapping.put("serverId", serverId);
        mappings.put(mapping);
        prefs.edit().putString("idMappings", mappings.toString()).commit();
    }

    private void applyMapping(JSONArray queue, int completedIndex, long localId, Object serverId) throws JSONException {
        String id = String.valueOf(localId);
        String replacement = String.valueOf(serverId);
        Pattern pattern = Pattern.compile("(?<!\\d)" + Pattern.quote(id) + "(?!\\d)");
        for (int index = completedIndex + 1; index < queue.length(); index++) {
            JSONObject item = queue.optJSONObject(index);
            if (item == null) continue;
            String url = item.optString("url", "");
            Matcher matcher = pattern.matcher(url);
            item.put("url", matcher.replaceAll(Matcher.quoteReplacement(replacement)));
            if (item.has("data")) item.put("data", replaceValue(item.opt("data"), localId, serverId));
            queue.put(index, item);
        }
    }

    private Object replaceValue(Object value, long localId, Object serverId) throws JSONException {
        if (value instanceof Number && ((Number) value).longValue() == localId) return serverId;
        if (String.valueOf(localId).equals(value)) return serverId;
        if (value instanceof JSONObject) {
            JSONObject source = (JSONObject) value;
            JSONObject result = new JSONObject();
            java.util.Iterator<String> keys = source.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                result.put(key, replaceValue(source.opt(key), localId, serverId));
            }
            return result;
        }
        if (value instanceof JSONArray) {
            JSONArray source = (JSONArray) value;
            JSONArray result = new JSONArray();
            for (int index = 0; index < source.length(); index++) result.put(replaceValue(source.opt(index), localId, serverId));
            return result;
        }
        return value;
    }
}
