package com.spacecadet.superchat;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Map;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureCredentials")
public class SecureCredentialsPlugin extends Plugin {
    private static final String KEYSTORE_NAME = "AndroidKeyStore";
    private static final String KEY_ALIAS = "com.spacecadet.superchat.credentials.v1";
    private static final String PREFERENCES_NAME = "super_chat_secure_credentials_v1";
    private static final String SECRET_PREFIX = "secret.";
    private static final String REFERENCE_PREFIX = "reference.";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_TAG_BITS = 128;
    private static final int MAX_ID_LENGTH = 512;
    private static final int MAX_LABEL_LENGTH = 200;
    private static final int MAX_PROVIDER_LENGTH = 100;
    private static final int MAX_SECRET_LENGTH = 65536;

    @PluginMethod
    public void listCredentials(PluginCall call) {
        try {
            SharedPreferences preferences = getPreferences();
            Map<String, ?> values = preferences.getAll();
            JSArray credentials = new JSArray();

            for (Map.Entry<String, ?> entry : values.entrySet()) {
                String preferenceKey = entry.getKey();
                if (!preferenceKey.startsWith(REFERENCE_PREFIX) || !(entry.getValue() instanceof String)) {
                    continue;
                }

                String encodedId = preferenceKey.substring(REFERENCE_PREFIX.length());
                String secretKey = SECRET_PREFIX + encodedId;
                if (!preferences.contains(secretKey)) continue;

                try {
                    String id = decodeId(encodedId);
                    JSONObject reference = new JSONObject((String) entry.getValue());
                    JSObject result = new JSObject();
                    result.put("id", id);
                    result.put("label", reference.optString("label", "Credential"));
                    String provider = reference.optString("provider", "");
                    if (!provider.isEmpty()) result.put("provider", provider);
                    credentials.put(result);
                } catch (Exception ignored) {
                    // Ignore incomplete metadata records; never expose the encrypted value here.
                }
            }

            JSObject result = new JSObject();
            result.put("credentials", credentials);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not list secure credentials", exception);
        }
    }

    @PluginMethod
    public void getCredential(PluginCall call) {
        try {
            String id = requireText(call, "id", MAX_ID_LENGTH);
            SharedPreferences preferences = getPreferences();
            String encoded = preferences.getString(SECRET_PREFIX + encodeId(id), null);
            JSObject result = new JSObject();
            if (encoded == null) {
                result.put("secret", JSObject.NULL);
                call.resolve(result);
                return;
            }

            String[] parts = encoded.split("\\.", 2);
            if (parts.length != 2) throw new IllegalStateException("Stored credential is invalid");
            byte[] iv = Base64.decode(parts[0], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            byte[] ciphertext = Base64.decode(parts[1], Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            cipher.updateAAD(id.getBytes(StandardCharsets.UTF_8));
            String secret = new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
            result.put("secret", secret);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not read secure credential", exception);
        }
    }

    @PluginMethod
    public void setCredential(PluginCall call) {
        try {
            String id = requireText(call, "id", MAX_ID_LENGTH);
            String label = requireText(call, "label", MAX_LABEL_LENGTH);
            String provider = call.getString("provider", "");
            String secret = call.getString("secret");
            if (secret == null || secret.isEmpty()) throw new IllegalArgumentException("Credential value is required");
            if (secret.length() > MAX_SECRET_LENGTH) throw new IllegalArgumentException("Credential value is too long");
            if (provider.length() > MAX_PROVIDER_LENGTH) throw new IllegalArgumentException("Provider name is too long");

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            cipher.updateAAD(id.getBytes(StandardCharsets.UTF_8));
            byte[] ciphertext = cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
            String encoded = encode(cipher.getIV()) + "." + encode(ciphertext);

            JSONObject reference = new JSONObject();
            reference.put("label", label);
            if (!provider.isEmpty()) reference.put("provider", provider);

            String encodedId = encodeId(id);
            SharedPreferences.Editor editor = getPreferences().edit();
            editor.putString(SECRET_PREFIX + encodedId, encoded);
            editor.putString(REFERENCE_PREFIX + encodedId, reference.toString());
            if (!editor.commit()) throw new IllegalStateException("Could not save secure credential");
            call.resolve();
        } catch (Exception exception) {
            call.reject("Could not store secure credential", exception);
        }
    }

    @PluginMethod
    public void deleteCredential(PluginCall call) {
        try {
            String id = requireText(call, "id", MAX_ID_LENGTH);
            String encodedId = encodeId(id);
            SharedPreferences.Editor editor = getPreferences().edit();
            editor.remove(SECRET_PREFIX + encodedId);
            editor.remove(REFERENCE_PREFIX + encodedId);
            if (!editor.commit()) throw new IllegalStateException("Could not delete secure credential");
            call.resolve();
        } catch (Exception exception) {
            call.reject("Could not delete secure credential", exception);
        }
    }

    private SharedPreferences getPreferences() {
        return getContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE_NAME);
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_NAME);
        KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build();
        generator.init(spec);
        return generator.generateKey();
    }

    private String requireText(PluginCall call, String field, int maxLength) {
        String value = call.getString(field);
        if (value == null || value.trim().isEmpty()) throw new IllegalArgumentException(field + " is required");
        if (value.length() > maxLength) throw new IllegalArgumentException(field + " is too long");
        return value;
    }

    private String encodeId(String id) {
        return Base64.encodeToString(id.getBytes(StandardCharsets.UTF_8), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }

    private String decodeId(String encodedId) {
        return new String(Base64.decode(encodedId, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING), StandardCharsets.UTF_8);
    }

    private String encode(byte[] value) {
        return Base64.encodeToString(value, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    }
}
