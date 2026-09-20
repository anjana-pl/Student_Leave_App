package com.example

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.JsResult
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.File

class MainActivity : ComponentActivity() {
  private lateinit var webView: WebView
  private var filePathCallback: ValueCallback<Array<Uri>>? = null

  private val fileChooserLauncher = registerForActivityResult(
    ActivityResultContracts.StartActivityForResult()
  ) { result ->
    val uriResult: Array<Uri>? = if (result.resultCode == RESULT_OK) {
      val data = result.data
      if (data?.clipData != null) {
        val count = data.clipData!!.itemCount
        Array(count) { i -> data.clipData!!.getItemAt(i).uri }
      } else if (data?.data != null) {
        arrayOf(data.data!!)
      } else {
        null
      }
    } else {
      null
    }
    filePathCallback?.onReceiveValue(uriResult)
    filePathCallback = null
  }

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    // Pre-create WebView cache directories to prevent Chromium simple_file_enumerator opendir errors
    try {
      val wasmCacheDir = File(cacheDir, "WebView/Default/HTTP Cache/Code Cache/wasm")
      if (!wasmCacheDir.exists()) {
        wasmCacheDir.mkdirs()
      }
      val jsCacheDir = File(cacheDir, "WebView/Default/HTTP Cache/Code Cache/js")
      if (!jsCacheDir.exists()) {
        jsCacheDir.mkdirs()
      }
    } catch (e: Exception) {
      Log.w("MainActivity", "Could not pre-create cache directories", e)
    }

    webView = WebView(this).apply {
      // Software rendering avoids Mesa /dev/dri/renderD128 rendernode missing errors in emulator environments
      setLayerType(View.LAYER_TYPE_SOFTWARE, null)

      // Configure settings
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      settings.databaseEnabled = true
      settings.allowFileAccess = true
      settings.allowContentAccess = true
      settings.cacheMode = WebSettings.LOAD_NO_CACHE
      settings.useWideViewPort = true
      settings.loadWithOverviewMode = true

      webViewClient = object : WebViewClient() {
        override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
          Log.w("MainActivity", "WebView render process gone, reloading index.html")
          view?.post {
            view.loadUrl("file:///android_asset/index.html")
          }
          return true
        }
      }

      webChromeClient = object : WebChromeClient() {
        override fun onConsoleMessage(message: ConsoleMessage?): Boolean {
          Log.d("WebViewConsole", "${message?.message()} [line ${message?.lineNumber()}]")
          return true
        }

        override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
          AlertDialog.Builder(this@MainActivity)
            .setTitle("Notice")
            .setMessage(message ?: "")
            .setPositiveButton(android.R.string.ok) { dialog, _ ->
              dialog.dismiss()
              result?.confirm()
            }
            .setOnCancelListener {
              result?.cancel()
            }
            .setCancelable(true)
            .create()
            .show()
          return true
        }

        override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
          AlertDialog.Builder(this@MainActivity)
            .setTitle("Confirmation")
            .setMessage(message ?: "")
            .setPositiveButton(android.R.string.ok) { dialog, _ ->
              dialog.dismiss()
              result?.confirm()
            }
            .setNegativeButton(android.R.string.cancel) { dialog, _ ->
              dialog.dismiss()
              result?.cancel()
            }
            .setOnCancelListener {
              result?.cancel()
            }
            .setCancelable(true)
            .create()
            .show()
          return true
        }

        override fun onShowFileChooser(
          webView: WebView?,
          filePathCallback: ValueCallback<Array<Uri>>?,
          fileChooserParams: FileChooserParams?
        ): Boolean {
          this@MainActivity.filePathCallback?.onReceiveValue(null)
          this@MainActivity.filePathCallback = filePathCallback

          val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
          }

          try {
            fileChooserLauncher.launch(intent)
          } catch (e: Exception) {
            Log.e("MainActivity", "Failed to launch file chooser", e)
            this@MainActivity.filePathCallback?.onReceiveValue(null)
            this@MainActivity.filePathCallback = null
            return false
          }
          return true
        }
      }

      loadUrl("file:///android_asset/index.html")
    }

    setContentView(webView)

    ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      view.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
      insets
    }

    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          if (webView.canGoBack()) {
            webView.goBack()
          } else {
            isEnabled = false
            onBackPressedDispatcher.onBackPressed()
          }
        }
      },
    )
  }
}

