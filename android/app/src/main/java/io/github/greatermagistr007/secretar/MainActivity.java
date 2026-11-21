package io.github.greatermagistr007.secretar;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Локальные плагины регистрируются до создания моста: Capacitor находит в
        // node_modules только плагины-пакеты, а эти живут в коде приложения.
        registerPlugin(TaskNotifierPlugin.class);
        registerPlugin(ModelDownloaderPlugin.class);
        registerPlugin(VoicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
