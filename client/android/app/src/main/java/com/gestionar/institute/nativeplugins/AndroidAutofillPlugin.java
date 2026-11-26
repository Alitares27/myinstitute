package com.gestionar.institute.nativeplugins;

import android.os.Build;
import android.view.autofill.AutofillManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidAutofill")
public class AndroidAutofillPlugin extends Plugin {
    @PluginMethod
    public void commitLogin(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    AutofillManager manager = getActivity().getSystemService(AutofillManager.class);
                    if (manager != null && manager.isEnabled()) manager.commit();
                }
                call.resolve();
            } catch (RuntimeException error) {
                call.reject("No se pudo completar el autocompletado de Android.");
            }
        });
    }
}
