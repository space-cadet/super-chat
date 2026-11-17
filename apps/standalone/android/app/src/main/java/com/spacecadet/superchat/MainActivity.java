package com.spacecadet.superchat;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemDiagnosticsPlugin.class);
        registerPlugin(SecureCredentialsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
