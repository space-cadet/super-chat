package com.spacecadet.superchat;

import android.app.ActivityManager;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.PermissionInfo;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemDiagnostics")
public class SystemDiagnosticsPlugin extends Plugin {
    @PluginMethod
    public void getSnapshot(PluginCall call) {
        try {
            Context context = getContext();
            PackageManager packageManager = context.getPackageManager();

            JSObject result = new JSObject();
            result.put("hostPlatform", "Android");
            result.put("osVersion", Build.VERSION.RELEASE);
            result.put("architecture", Build.SUPPORTED_ABIS.length == 0 ? "unknown" : Build.SUPPORTED_ABIS[0]);
            result.put("processor", Build.HARDWARE);
            result.put("processorCount", Runtime.getRuntime().availableProcessors());
            NetworkCapabilities capabilities = getActiveNetworkCapabilities(context);
            result.put("internetValidated", capabilities == null
                ? JSObject.NULL
                : capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED));
            result.put("transports", getTransports(capabilities));
            result.put("permissions", getAppPermissions(context, packageManager));

            ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
            ActivityManager activityManager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            activityManager.getMemoryInfo(memoryInfo);
            result.put("totalMemoryBytes", memoryInfo.totalMem);
            result.put("availableMemoryBytes", memoryInfo.availMem);
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not read system diagnostics", exception);
        }
    }

    private NetworkCapabilities getActiveNetworkCapabilities(Context context) {
        ConnectivityManager connectivityManager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        Network activeNetwork = connectivityManager.getActiveNetwork();
        return activeNetwork == null ? null : connectivityManager.getNetworkCapabilities(activeNetwork);
    }

    private JSArray getTransports(NetworkCapabilities capabilities) {
        JSArray transports = new JSArray();
        if (capabilities == null) return transports;
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) transports.put("wifi");
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) transports.put("cellular");
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) transports.put("ethernet");
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) transports.put("vpn");
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH)) transports.put("bluetooth");
        return transports;
    }

    private JSArray getAppPermissions(Context context, PackageManager packageManager) throws PackageManager.NameNotFoundException {
        JSArray permissions = new JSArray();
        PackageInfo packageInfo;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageInfo = packageManager.getPackageInfo(
                context.getPackageName(),
                PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS)
            );
        } else {
            packageInfo = packageManager.getPackageInfo(context.getPackageName(), PackageManager.GET_PERMISSIONS);
        }

        if (packageInfo.requestedPermissions == null) return permissions;
        for (String permissionName : packageInfo.requestedPermissions) {
            PermissionInfo permissionInfo;
            try {
                permissionInfo = packageManager.getPermissionInfo(permissionName, 0);
            } catch (PackageManager.NameNotFoundException ignored) {
                continue;
            }

            int protection = permissionInfo.protectionLevel & PermissionInfo.PROTECTION_MASK_BASE;
            String category = protection == PermissionInfo.PROTECTION_DANGEROUS
                ? "runtime"
                : protection == PermissionInfo.PROTECTION_SIGNATURE
                    ? "signature"
                    : "normal";

            JSObject permission = new JSObject();
            permission.put("name", permissionName);
            permission.put("granted", context.checkSelfPermission(permissionName) == PackageManager.PERMISSION_GRANTED);
            permission.put("category", category);
            permissions.put(permission);
        }
        return permissions;
    }
}
