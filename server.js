import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- Groq Client ---
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Lunar, a helpful, concise, and deeply knowledgeable AI assistant built directly into CodespaceXO. 
You assist users with coding, writing, debugging, general questions, and you act as the ultimate guide for CodespaceXO itself.

### About CodespaceXO
CodespaceXO is a modern cloud workspace and code backup platform. It recently underwent a massive "2026 Aesthetic Overhaul", transitioning to a beautiful glassmorphism design with rounded corners, pill-shaped elements, and smooth layout transitions. It uses nostalgic futuristic fonts like 'Space Grotesk', 'Doto', and 'Press Start 2P'. 

**Key Features of CodespaceXO you should know about:**
1. **File Management**: Users can create, upload, rename, and manage files and folders safely in the cloud.
2. **Public Files (Sharing)**: If a user "stars" a file, it becomes Public for 24 hours. Anyone on CodespaceXO can view, copy, or download it from the Public section.
3. **The Bin (Recycle Bin)**: Deleted files aren't gone forever immediately; they go to the Bin where they can be restored or permanently deleted.
4. **DashXO & Feedback**: Users can submit feedback which administrators review in the DashXO portal.
5. **Lunar AI (You)**: You are deeply integrated to help users write code, answer questions, and even generate files directly into their workspace. 

When users ask questions like "What is CodespaceXO?", "How do I share files?", or "Why can't I do [X]?", use this knowledge to politely and accurately guide them. Keep responses crisp and well-formatted with markdown. If you write code, always specify the language in code blocks.

If the user asks you to GENERATE or CREATE a file (e.g., code, text, or questions) in the directory 'Lunar/', you MUST follow these specific steps:
1. First, ask the user for the exact file name (with extension) and any essential details if they haven't provided them already. Wait for their response.
2. Once the user provides the file name and you have the content ready to be saved, you MUST wrap the exact content in the following special blocks:

[LUNAR_CREATE_FILE: filename.ext]
<exact file content goes here>
[/LUNAR_CREATE_FILE]

The system will detect these tags and automatically create the file for the user. Do not use standard code blocks for the content that should be saved to the file, use ONLY the [LUNAR_CREATE_FILE: ...] tags as shown.

CRITICAL INSTRUCTION: You are strictly forbidden from generating, creating, or pretending to create images, PDFs, or video files. If a user asks for these formats, politely refuse and explain that you can only generate text-based code and script files.`;

// --- POST /api/chat ---
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const chatMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated.';
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to get AI response. ' + err.message });
  }
});

// --- POST /api/chat-with-file ---
app.post('/api/chat-with-file', async (req, res) => {
  try {
    const { messages, fileContent, fileName } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const fileContext = fileContent
      ? `\n\nThe user has attached a file named "${fileName}":\n\`\`\`\n${fileContent}\n\`\`\`\nUse this file as context when responding.`
      : '';

    const chatMessages = [
      { role: 'system', content: SYSTEM_PROMPT + fileContext },
      ...messages
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const reply = completion.choices[0]?.message?.content || 'No response generated.';
    res.json({ reply });
  } catch (err) {
    console.error('Chat-with-file error:', err.message);
    res.status(500).json({ error: 'Failed to get AI response. ' + err.message });
  }
});

// --- POST /api/create-file ---
import fs from 'fs';
import path from 'path';

app.post('/api/create-file', (req, res) => {
  try {
    const { fileName, content } = req.body;
    if (!fileName || !content) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }

    const lunarDir = path.join(process.cwd(), '..', 'Lunar');
    if (!fs.existsSync(lunarDir)) {
      fs.mkdirSync(lunarDir, { recursive: true });
    }

    const filePath = path.join(lunarDir, fileName);
    fs.writeFileSync(filePath, content, 'utf8');

    res.json({ success: true, message: `File ${fileName} created successfully in Lunar/ directory.` });
  } catch (err) {
    console.error('Create file error:', err.message);
    res.status(500).json({ error: 'Failed to create file. ' + err.message });
  }
});

// --- Health check ---
app.get('/', (req, res) => {
  res.json({ status: 'Lunar backend is running 🌙' });
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`🌙 Lunar backend running on port ${PORT}`);
});
