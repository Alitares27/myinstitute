package com.gestionar.institute.nativeplugins;

import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;

final class OfflineQueueStore {
    private static final String TAG = "GestionARSync";
    static final String PREFS = "gestionar-offline-sync";
    static final String QUEUE_KEY = "outbox";
    static final int JOB_ID = 50721;

    private OfflineQueueStore() {}

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static JSONArray readQueue(Context context) {
        try {
            return new JSONArray(preferences(context).getString(QUEUE_KEY, "[]"));
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    static void writeQueue(Context context, JSONArray queue) {
        preferences(context).edit().putString(QUEUE_KEY, queue.toString()).commit();
    }

    static void schedule(Context context) {
        JobInfo job = new JobInfo.Builder(
            JOB_ID,
            new ComponentName(context, OfflineSyncJobService.class)
        )
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
            .setPersisted(true)
            .setBackoffCriteria(30_000L, JobInfo.BACKOFF_POLICY_EXPONENTIAL)
            .build();
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler != null) {
            try {
                scheduler.schedule(job);
            } catch (SecurityException error) {
                Log.e(TAG, "No se pudo programar la sincronización en segundo plano.", error);
            }
        }
    }
}
