package io.github.greatermagistr007.secretar;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Локальный плагин регистрируется до создания моста: Capacitor находит в
        // node_modules только плагины-пакеты, а этот живёт в коде приложения.
        registerPlugin(TaskNotifierPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
