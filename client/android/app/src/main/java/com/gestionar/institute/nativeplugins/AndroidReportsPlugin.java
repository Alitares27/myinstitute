package com.gestionar.institute.nativeplugins;

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


import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
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
        try {
            java.io.File folder = new java.io.File(getContext().getCacheDir(), "reports");
            if (!folder.isDirectory() && !folder.mkdirs()) throw new IOException("No se pudo preparar el reporte.");
            java.io.File[] previousReports = folder.listFiles();
            if (previousReports != null) {
                long cutoff = System.currentTimeMillis() - 86_400_000L;
                for (java.io.File report : previousReports) {
                    if (report.isFile() && report.lastModified() < cutoff) report.delete();
                }
            }
            String safeName = name.replaceAll("[^\\p{L}\\p{N}._-]", "_");
            java.io.File file = java.io.File.createTempFile("reporte-", "-" + safeName, folder);
            try (OutputStream output = new java.io.FileOutputStream(file)) {
                output.write(Base64.decode(call.getString("base64"), Base64.DEFAULT));
            }
            android.net.Uri uri = androidx.core.content.FileProvider.getUriForFile(
                getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent share = new Intent(Intent.ACTION_SEND)
                .setType("application/pdf")
                .putExtra(Intent.EXTRA_STREAM, uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            share.setClipData(android.content.ClipData.newRawUri(name, uri));
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(Intent.createChooser(share, "Compartir PDF"));
                    call.resolve();
                } catch (RuntimeException error) {
                    call.reject("No se pudo compartir el PDF.", error);
                }
            });
        } catch (IOException | RuntimeException error) {
            call.reject("No se pudo preparar el PDF.", error);
        }
    }
}
