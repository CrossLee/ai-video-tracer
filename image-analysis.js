import 'dotenv/config';

/**
 * Analyzes an image using the SophNet API to generate a description/prompt.
 * @param {string} imageUrl - The URL or Base64 string of the image.
 * @returns {Promise<string>} - The generated description/prompt.
 */
export async function analyzeImage(imageUrl) {
  const apiKey = process.env.SOPHNET_API_KEY;
  if (!apiKey) {
    throw new Error("SOPHNET_API_KEY is not set");
  }

  const endpoint = "https://www.sophnet.com/api/open-apis/v1/chat/completions";

  const payload = {
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "这张图片中有什么？"
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }
        ]
      }
    ],
    model: "Qwen2.5-VL-32B-Instruct",
    stream: false
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error("No description returned from API");
    }

  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw error;
  }
}
