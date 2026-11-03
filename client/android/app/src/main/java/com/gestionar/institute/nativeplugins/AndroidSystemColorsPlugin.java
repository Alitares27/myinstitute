package com.gestionar.institute.nativeplugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.material.color.MaterialColors;

@CapacitorPlugin(name = "AndroidSystemColors")
public class AndroidSystemColorsPlugin extends Plugin {
    @PluginMethod
    public void getColors(PluginCall call) {
        int primary = MaterialColors.getColor(
            getActivity(),
            androidx.appcompat.R.attr.colorPrimary,
            0xFF6750A4
        );
        int onPrimary = MaterialColors.getColor(
            getActivity(),
            com.google.android.material.R.attr.colorOnPrimary,
            0xFFFFFFFF
        );
        int surface = MaterialColors.getColor(
            getActivity(),
            com.google.android.material.R.attr.colorSurface,
            0xFFF2F2F7
        );

        JSObject result = new JSObject();
        result.put("primary", toHex(primary));
        result.put("onPrimary", toHex(onPrimary));
        result.put("surface", toHex(surface));
        call.resolve(result);
    }

    private String toHex(int color) {
        return String.format("#%06X", 0xFFFFFF & color);
    }
}
