package com.codenection.breathe

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.codenection.breathe.ui.MarginApp
import com.codenection.breathe.ui.theme.MarginTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MarginTheme {
                MarginApp()
            }
        }
    }
}
