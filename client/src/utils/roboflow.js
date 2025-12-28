export async function detectObjects(imageBlob) {
  const formData = new FormData();
  formData.append('file', imageBlob);

  const response = await fetch(
    `https://detect.roboflow.com/${import.meta.env.ROBOFLOW_MODEL_ID}?api_key=${import.meta.env.ROBOFLOW_API_KEY}`,
    {
      method: 'POST',
      body: formData
    }
  );

  const result = await response.json();
  return result;
}
