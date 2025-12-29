const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

async function testTextFileUpload() {
  try {
    // Create a sample text file
    const sampleText = "This is a test text file for upload.\nIt contains multiple lines.\nThis should work now.";
    fs.writeFileSync('test-sample.txt', sampleText);

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream('test-sample.txt'), 'test-sample.txt');
    form.append('agency', 'TEST');
    form.append('uploadedBy', 'testuser');

    // Send request
    const response = await fetch('http://localhost:3000/api/ingest/pdf', {
      method: 'POST',
      body: form
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', result);

    // Clean up
    fs.unlinkSync('test-sample.txt');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testTextFileUpload();
