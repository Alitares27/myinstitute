package com.gestionar.institute;

import android.os.Build;
import android.view.View;

import com.getcapacitor.BridgeActivity;
import com.gestionar.institute.nativeplugins.AndroidSystemColorsPlugin;
import com.gestionar.institute.nativeplugins.AndroidReportsPlugin;
import com.gestionar.institute.nativeplugins.NativeOfflineSyncPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AndroidSystemColorsPlugin.class);
        registerPlugin(AndroidReportsPlugin.class);
        registerPlugin(NativeOfflineSyncPlugin.class);
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && getBridge() != null) {
            getBridge().getWebView().setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        }
    }
}
