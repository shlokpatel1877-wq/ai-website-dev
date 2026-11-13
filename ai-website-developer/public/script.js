// Store the current generated code in memory
let currentCode = {
  html: '',
  css: '',
  js: ''
};

// Currently active tab ('preview', 'html', 'css', 'js')
let currentTab = 'preview';

// DOM Elements
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const btnText = generateBtn.querySelector('.btn-text');
const btnSpinner = generateBtn.querySelector('.btn-spinner');
const statusMessage = document.getElementById('statusMessage');
const outputSection = document.getElementById('outputSection');
const previewFrame = document.getElementById('previewFrame');
const htmlCodeElem = document.getElementById('htmlCode');
const cssCodeElem = document.getElementById('cssCode');
const jsCodeElem = document.getElementById('jsCode');
const copyBtn = document.getElementById('copyBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const chipButtons = document.querySelectorAll('.chip');
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const closeModalBtn = document.getElementById('closeModalBtn');

// 1. Example Prompts: Clicking a chip fills the textarea
chipButtons.forEach(button => {
  button.addEventListener('click', () => {
    promptInput.value = button.getAttribute('data-prompt');
    promptInput.focus();
  });
});

// 2. Tab Navigation
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetTab = button.getAttribute('data-tab');
    switchTab(targetTab);
  });
});

function switchTab(tabName) {
  currentTab = tabName;

  // Update tab buttons active state
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // Update tab content active state
  tabContents.forEach(content => {
    content.classList.remove('active');
  });

  const activeContent = document.getElementById(`${tabName}Tab`);
  if (activeContent) {
    activeContent.classList.add('active');
  }
}

// 3. Generate Website Function
async function generateWebsite() {
  const prompt = promptInput.value.trim();

  // Validate user input
  if (!prompt) {
    showStatus('Please describe the website you want to build.', 'error');
    promptInput.focus();
    return;
  }

  // Set UI to loading state
  setLoading(true);
  showStatus('AI is building your website... Please wait a few seconds.', 'info');

  try {
    // Call the backend Express API
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate website.');
    }

    // Save generated code
    currentCode = {
      html: data.html || '',
      css: data.css || '',
      js: data.js || ''
    };

    // Update the code display blocks
    htmlCodeElem.textContent = currentCode.html;
    cssCodeElem.textContent = currentCode.css;
    jsCodeElem.textContent = currentCode.js;

    // Render in iframe preview
    renderPreview();

    // Show output section and switch to preview tab
    outputSection.classList.remove('hidden');
    switchTab('preview');
    showStatus('Website generated successfully!', 'info');

    // Smooth scroll down to preview
    outputSection.scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    console.error('Generation Error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

// 4. Render code inside sandboxed iframe
function renderPreview() {
  // Combine HTML, CSS, and JS into a complete standalone page
  const fullDocument = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${currentCode.css}
  </style>
</head>
<body>
  ${currentCode.html}
  <script>
    try {
      ${currentCode.js}
    } catch(err) {
      console.error("Preview Script Error:", err);
    }
  <\/script>
</body>
</html>
  `.trim();

  // Load into iframe using srcdoc for safe, isolated preview
  previewFrame.srcdoc = fullDocument;
}

// 5. Copy Code to Clipboard
copyBtn.addEventListener('click', async () => {
  let textToCopy = '';

  // Determine what to copy based on active tab
  if (currentTab === 'html') {
    textToCopy = currentCode.html;
  } else if (currentTab === 'css') {
    textToCopy = currentCode.css;
  } else if (currentTab === 'js') {
    textToCopy = currentCode.js;
  } else {
    // If preview tab is active, copy the full complete HTML document
    textToCopy = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${currentCode.css}
  </style>
</head>
<body>
${currentCode.html}
  <script>
${currentCode.js}
  <\/script>
</body>
</html>`;
  }

  if (!textToCopy) {
    showStatus('No code available to copy.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(textToCopy);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  } catch (err) {
    showStatus('Failed to copy to clipboard.', 'error');
  }
});

// 6. Regenerate Button
regenerateBtn.addEventListener('click', () => {
  generateWebsite();
});

// 7. Event Listeners for Generation
generateBtn.addEventListener('click', generateWebsite);

// Allow generating with Ctrl + Enter inside textarea
promptInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    generateWebsite();
  }
});

// 8. Helper Functions
function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  regenerateBtn.disabled = isLoading;
  if (isLoading) {
    btnText.textContent = 'Building...';
    btnSpinner.classList.remove('hidden');
  } else {
    btnText.textContent = 'Generate Website';
    btnSpinner.classList.add('hidden');
  }
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-msg ${type}`;
}

// 9. About Modal Controls
aboutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  aboutModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
  aboutModal.classList.add('hidden');
});

aboutModal.addEventListener('click', (e) => {
  if (e.target === aboutModal) {
    aboutModal.classList.add('hidden');
  }
});
