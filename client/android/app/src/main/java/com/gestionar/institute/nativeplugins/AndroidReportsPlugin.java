package com.gestionar.institute.nativeplugins;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "AndroidReports")
public class AndroidReportsPlugin extends Plugin {
    @PluginMethod
    public void printHtml(PluginCall call) {
        String title = call.getString("title");
        String html = call.getString("html");
        if (title == null || html == null) {
            call.reject("Faltan los datos del reporte.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            PrintManager manager = getActivity().getSystemService(PrintManager.class);
            if (manager == null) {
                call.reject("La impresión no está disponible.");
                return;
            }

            WebView report = new WebView(getActivity());
            report.getSettings().setBlockNetworkLoads(true);
            report.getSettings().setAllowFileAccess(false);
            report.getSettings().setAllowContentAccess(false);
            report.setWebViewClient(new WebViewClient() {
                private boolean submitted;

                @Override
                public void onPageFinished(WebView view, String url) {
                    if (submitted) return;
                    submitted = true;
                    try {
                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(title);
                        manager.print(title, new PrintDocumentAdapter() {
                            @Override
                            public void onStart() {
                                adapter.onStart();
                            }

                            @Override
                            public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes,
                                    CancellationSignal cancellation, LayoutResultCallback callback, Bundle extras) {
                                adapter.onLayout(oldAttributes, newAttributes, cancellation, callback, extras);
                            }

                            @Override
                            public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                                    CancellationSignal cancellation, WriteResultCallback callback) {
                                adapter.onWrite(pages, destination, cancellation, callback);
                            }

                            @Override
                            public void onFinish() {
                                try {
                                    adapter.onFinish();
                                } finally {
                                    view.destroy();
                                }
                            }
                        }, null);
                        call.resolve();
                    } catch (RuntimeException error) {
                        view.destroy();
                        call.reject("No se pudo abrir la impresión.", error);
                    }
                }
            });
            report.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });
    }

    @PluginMethod
    public void savePdf(PluginCall call) {
        String name = call.getString("name");
        if (name == null || call.getString("base64") == null) {
            call.reject("Faltan los datos del PDF.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType("application/pdf")
            .putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(call, intent, "onSavePdf");
        } catch (RuntimeException error) {
            call.reject("No se pudo abrir el selector de archivos.", error);
        }
    }

    @ActivityCallback
    private void onSavePdf(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null
                || result.getData().getData() == null) {
            call.resolve();
            return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData())) {
            if (output == null) throw new IOException("No se pudo abrir el destino.");
            output.write(Base64.decode(call.getString("base64"), Base64.DEFAULT));
        } catch (IOException | RuntimeException error) {
            call.reject("No se pudo guardar el PDF.", error);
            return;
        }
        call.resolve();
    }
}
