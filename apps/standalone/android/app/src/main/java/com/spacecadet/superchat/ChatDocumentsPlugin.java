package com.spacecadet.superchat;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "ChatDocuments")
public class ChatDocumentsPlugin extends Plugin {
    private boolean saving = false;
    private String pendingToken;
    private String pendingContent;

    @PluginMethod
    public synchronized void cancel(PluginCall call) {
        if (pendingToken != null && pendingToken.equals(call.getString("token"))) {
            pendingToken = null;
            pendingContent = null;
        }
        call.resolve();
    }

    @PluginMethod
    public synchronized void save(PluginCall call) {
        String filename = call.getString("filename");
        String content = call.getString("content");
        if (filename == null || content == null || call.getString("token") == null) {
            call.reject("A filename and content are required.");
            return;
        }
        if (saving) {
            call.reject("Finish the current file export first.");
            return;
        }
        saving = true;
        pendingToken = call.getString("token");
        pendingContent = content;
        call.getData().remove("content");
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(filename.endsWith(".json") ? "application/json" : "text/plain");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(call, intent, "documentCreated");
        } catch (Exception error) {
            saving = false;
            pendingToken = null; pendingContent = null;
            call.reject("Could not open the file picker.", error);
        }
    }

    @ActivityCallback
    private synchronized void documentCreated(PluginCall call, ActivityResult result) {
        saving = false;
        if (call == null) return;
        String content = pendingContent;
        boolean active = pendingToken != null && pendingToken.equals(call.getString("token"));
        pendingToken = null; pendingContent = null;
        if (!active || content == null) { call.reject("Export cancelled because the sign-in session ended."); return; }
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.reject("Export cancelled.");
            return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(data.getData(), "wt")) {
            if (output == null) throw new IllegalStateException("The destination could not be opened.");
            output.write(content.getBytes(StandardCharsets.UTF_8));
            JSObject response = new JSObject();
            response.put("uri", data.getData().toString());
            call.resolve(response);
        } catch (Exception error) {
            call.reject("Could not save the exported chat.", error);
        }
    }
}
