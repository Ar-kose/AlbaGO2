package com.alba.core.camera

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

data class CameraFrame(
    val bitmap: Bitmap,
    val timestampMs: Long,
    val width: Int,
    val height: Int,
    val rotationDegrees: Int,
    val isFrontCamera: Boolean
)

interface CameraFrameSource {
    val frames: SharedFlow<CameraFrame>
    fun bind(
        lifecycleOwner: LifecycleOwner,
        previewView: PreviewView,
        lensFacing: Int = CameraSelector.LENS_FACING_FRONT
    )
    fun unbind()
}

class CameraXFrameSource(
    private val context: Context
) : CameraFrameSource {
    private val frameFlow = MutableSharedFlow<CameraFrame>(
        replay = 0,
        extraBufferCapacity = 1
    )
    private val analysisExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    private var cameraProvider: ProcessCameraProvider? = null
    private var imageAnalysis: ImageAnalysis? = null

    override val frames: SharedFlow<CameraFrame> = frameFlow.asSharedFlow()

    override fun bind(
        lifecycleOwner: LifecycleOwner,
        previewView: PreviewView,
        lensFacing: Int
    ) {
        val providerFuture = ProcessCameraProvider.getInstance(context)
        providerFuture.addListener(
            {
                val provider = providerFuture.get()
                cameraProvider = provider
                val selector = CameraSelector.Builder()
                    .requireLensFacing(lensFacing)
                    .build()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
                val analyzer = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                    .build()
                    .also { imageAnalysis ->
                        imageAnalysis.setAnalyzer(analysisExecutor) { imageProxy ->
                            val bitmap = Bitmap.createBitmap(
                                imageProxy.width,
                                imageProxy.height,
                                Bitmap.Config.ARGB_8888
                            )
                            try {
                                val buffer = imageProxy.planes.first().buffer
                                buffer.rewind()
                                bitmap.copyPixelsFromBuffer(buffer)
                                val matrix = Matrix().apply {
                                    postRotate(imageProxy.imageInfo.rotationDegrees.toFloat())
                                    if (lensFacing == CameraSelector.LENS_FACING_FRONT) {
                                        postScale(
                                            -1f,
                                            1f,
                                            bitmap.width / 2f,
                                            bitmap.height / 2f
                                        )
                                    }
                                }
                                val output = Bitmap.createBitmap(
                                    bitmap,
                                    0,
                                    0,
                                    bitmap.width,
                                    bitmap.height,
                                    matrix,
                                    true
                                )
                                frameFlow.tryEmit(
                                    CameraFrame(
                                        bitmap = output,
                                        timestampMs = System.currentTimeMillis(),
                                        width = output.width,
                                        height = output.height,
                                        rotationDegrees = imageProxy.imageInfo.rotationDegrees,
                                        isFrontCamera = lensFacing == CameraSelector.LENS_FACING_FRONT
                                    )
                                )
                            } finally {
                                imageProxy.close()
                            }
                        }
                    }

                provider.unbindAll()
                provider.bindToLifecycle(lifecycleOwner, selector, preview, analyzer)
                imageAnalysis = analyzer
            },
            ContextCompat.getMainExecutor(context)
        )
    }

    override fun unbind() {
        imageAnalysis?.clearAnalyzer()
        imageAnalysis = null
        cameraProvider?.unbindAll()
        cameraProvider = null
    }
}
