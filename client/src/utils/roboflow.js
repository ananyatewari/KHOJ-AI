export async function detectObjects(imageBlob) {
  try {
    const formData = new FormData();
    formData.append('file', imageBlob);

    const modelId = import.meta.env.VITE_ROBOFLOW_MODEL_ID;
    const apiKey = import.meta.env.VITE_ROBOFLOW_API_KEY;

    console.log('🔍 Roboflow Config:', {
      modelId: modelId ? `${modelId.substring(0, 10)}...` : 'MISSING',
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
      hasModelId: !!modelId,
      hasApiKey: !!apiKey
    });

    if (!modelId || !apiKey) {
      console.error('❌ Roboflow credentials not configured');
      console.error('Expected: VITE_ROBOFLOW_MODEL_ID and VITE_ROBOFLOW_API_KEY in .env');
      return { predictions: [] };
    }

    const url = `https://detect.roboflow.com/${modelId}?api_key=${apiKey}`;
    console.log('📡 Calling Roboflow API:', url.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    console.log('📥 Roboflow Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Roboflow API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return { predictions: [] };
    }

    const result = await response.json();
    console.log('✅ Roboflow success:', {
      predictions: result.predictions?.length || 0
    });
    return result;
  } catch (error) {
    console.error('❌ Error calling Roboflow API:', error);
    return { predictions: [] };
  }
}
