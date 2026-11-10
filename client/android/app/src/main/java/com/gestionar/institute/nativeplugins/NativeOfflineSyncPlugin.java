package com.gestionar.institute.nativeplugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "NativeOfflineSync")
public class NativeOfflineSyncPlugin extends Plugin {
    @PluginMethod
    public void setSession(PluginCall call) {
        String userId = call.getString("userId");
        String token = call.getString("token");
        String apiBase = call.getString("apiBase");
        if (userId == null || token == null || apiBase == null) {
            call.reject("Faltan datos de sesión para la sincronización Android.");
            return;
        }
        OfflineQueueStore.preferences(getContext()).edit()
            .putString("activeUserId", userId)
            .putString("token", token)
            .putString("apiBase", apiBase)
            .commit();
        OfflineQueueStore.schedule(getContext());
        call.resolve();
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        String userId = call.getString("userId");
        android.content.SharedPreferences prefs = OfflineQueueStore.preferences(getContext());
        if (userId == null || userId.equals(prefs.getString("activeUserId", null))) {
            prefs.edit().remove("activeUserId").remove("token").remove("apiBase").commit();
        }
        call.resolve();
    }

    @PluginMethod
    public void enqueue(PluginCall call) {
        JSObject operation = call.getObject("operation");
        if (operation == null || operation.getString("id") == null || operation.getString("userId") == null) {
            call.reject("La operación local no es válida.");
            return;
        }
        synchronized (OfflineQueueStore.class) {
            JSONArray queue = OfflineQueueStore.readQueue(getContext());
            String id = operation.getString("id");
            boolean exists = false;
            for (int index = 0; index < queue.length(); index++) {
                if (id.equals(queue.optJSONObject(index).optString("id"))) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                try {
                    queue.put(new JSONObject(operation.toString()));
                } catch (JSONException error) {
                    call.reject("No se pudo guardar la operación local.", error);
                    return;
                }
            }
            OfflineQueueStore.writeQueue(getContext(), queue);
        }
        OfflineQueueStore.schedule(getContext());
        call.resolve();
    }

    @PluginMethod
    public void synchronizeNow(PluginCall call) {
        OfflineSyncJobService.synchronizeNow(getContext().getApplicationContext(), () -> call.resolve());
    }

    @PluginMethod
    public void getState(PluginCall call) {
        android.content.SharedPreferences prefs = OfflineQueueStore.preferences(getContext());
        String userId = prefs.getString("activeUserId", "");
        JSONArray queue = OfflineQueueStore.readQueue(getContext());
        JSONArray pendingIds = new JSONArray();
        String message = "";
        for (int index = 0; index < queue.length(); index++) {
            JSONObject entry = queue.optJSONObject(index);
            if (entry == null || !userId.equals(entry.optString("userId"))) continue;
            pendingIds.put(entry.optString("id"));
            if (message.isEmpty()) message = entry.optString("lastError", "");
        }
        JSONArray mappings = new JSONArray();
        try {
            JSONArray stored = new JSONArray(prefs.getString("idMappings", "[]"));
            for (int index = 0; index < stored.length(); index++) {
                JSONObject mapping = stored.optJSONObject(index);
                if (mapping != null && userId.equals(mapping.optString("userId"))) mappings.put(mapping);
            }
        } catch (JSONException ignored) {}

        JSObject result = new JSObject();
        result.put("activeUserId", userId);
        result.put("pendingIds", pendingIds);
        result.put("mappings", mappings);
        result.put("message", message);
        call.resolve(result);
    }

    @PluginMethod
    public void acknowledgeMappings(PluginCall call) {
        JSONArray localIds = call.getArray("localIds");
        if (localIds == null) {
            call.resolve();
            return;
        }
        android.content.SharedPreferences prefs = OfflineQueueStore.preferences(getContext());
        JSONArray remaining = new JSONArray();
        try {
            JSONArray stored = new JSONArray(prefs.getString("idMappings", "[]"));
            for (int index = 0; index < stored.length(); index++) {
                JSONObject mapping = stored.optJSONObject(index);
                if (mapping == null) continue;
                boolean acknowledged = false;
                for (int idIndex = 0; idIndex < localIds.length(); idIndex++) {
                    if (String.valueOf(mapping.optLong("localId")) .equals(localIds.optString(idIndex))) {
                        acknowledged = true;
                        break;
                    }
                }
                if (!acknowledged) remaining.put(mapping);
            }
        } catch (JSONException ignored) {}
        prefs.edit().putString("idMappings", remaining.toString()).commit();
        call.resolve();
    }
}
