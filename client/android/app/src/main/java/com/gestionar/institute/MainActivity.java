package com.gestionar.institute;

import com.getcapacitor.BridgeActivity;
import com.gestionar.institute.nativeplugins.AndroidSystemColorsPlugin;
import com.gestionar.institute.nativeplugins.NativeOfflineSyncPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AndroidSystemColorsPlugin.class);
        registerPlugin(NativeOfflineSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
