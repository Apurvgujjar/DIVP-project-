// --- Simple 3D Background Animation ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('bg-canvas'),
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

const particleCount = 500;
const particlesGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10; // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10; // z
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particleMaterial = new THREE.PointsMaterial({
    color: 0x22c55e, // Green color
    size: 0.05,
    transparent: true,
    opacity: 0.7
});

const particles = new THREE.Points(particlesGeometry, particleMaterial);
scene.add(particles);

camera.position.z = 5;

function animate3D() {
    requestAnimationFrame(animate3D);

    // Animate particles falling
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] -= 0.01; // Move down
        if (positions[i * 3 + 1] < -10) {
            positions[i * 3 + 1] = 10; // Reset to top
        }
    }
    particles.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
}
animate3D();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Chat Agent Logic ---
const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');

const geminiApiKey = "AIzaSyCKonMDpZO208RdiB11zb45-fUIbg1ip3o";

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    addMessageToChat('user', userMessage);
    userInput.value = '';
    
    const loadingIndicator = addMessageToChat('bot', '...', true);

    try {
        const botResponse = await callGeminiApi(userMessage);
        const botMessageElement = loadingIndicator.querySelector('p');
        botMessageElement.textContent = botResponse;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        const botMessageElement = loadingIndicator.querySelector('p');
        botMessageElement.textContent = `Sorry, an error occurred: ${error.message}.`;
        botMessageElement.parentElement.classList.add('bg-red-500/50');
    }
});

function addMessageToChat(sender, message, isLoading = false) {
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('flex', 'items-start', 'gap-3', 'chat-bubble');
    
    const iconDiv = document.createElement('div');
    iconDiv.classList.add('w-10', 'h-10', 'rounded-full', 'flex', 'items-center', 'justify-center', 'text-lg', 'flex-shrink-0');
    
    const messageContentDiv = document.createElement('div');
    messageContentDiv.classList.add('rounded-lg', 'p-4', 'max-w-lg');
    
    const messageP = document.createElement('p');
    messageP.classList.add('text-sm');
    messageP.textContent = message;

    if (sender === 'user') {
        messageWrapper.classList.add('justify-end');
        iconDiv.classList.add('bg-blue-500');
        iconDiv.textContent = '🧑‍💻';
        messageContentDiv.classList.add('bg-blue-600');
        messageWrapper.append(messageContentDiv, iconDiv);
    } else {
        messageWrapper.classList.add('justify-start');
        iconDiv.classList.add('bg-green-500');
        iconDiv.textContent = '🤖';
        messageContentDiv.classList.add('bg-gray-700');
        if (isLoading) {
            messageP.innerHTML = '<span class="animate-pulse">Thinking...</span>';
        }
        messageWrapper.append(iconDiv, messageContentDiv);
    }

    messageContentDiv.appendChild(messageP);
    chatContainer.appendChild(messageWrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return messageContentDiv;
}

async function callGeminiApi(question) {
    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
    
    const fullPrompt = `You are an expert on the United Nations Sustainable Development Goal 13 (Climate Action). Your ONLY function is to answer questions about climate change, its impacts, and related solutions.

If the user asks a question that is NOT related to climate change, you MUST politely refuse and state your purpose. For example, say: "I am an AI assistant focused on climate action and can only answer questions on that topic. Please ask a relevant question."

Under no circumstances should you answer an off-topic question.

Here is the user's question:
User: "${question}"

Your Answer:`;

    const payload = { 
        contents: [{
            parts: [{
                text: fullPrompt
            }]
        }]
    };
    
    const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        if (data.promptFeedback && data.promptFeedback.blockReason) {
             throw new Error(`Request was blocked: ${data.promptFeedback.blockReason}. Please rephrase your question.`);
        }
        throw new Error("No valid response was received from the API.");
    }

    const botResponseText = data.candidates[0].content.parts[0].text;
    return botResponseText;
}
