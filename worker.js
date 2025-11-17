/**
 * Cloudflare Worker翻译API
 * 基于Cloudflare AI进行文本翻译
 */

export default {
  async fetch(request) {
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    try {
      const url = new URL(request.url);
      const text = url.searchParams.get("text") || "";
      const to = url.searchParams.get("to") || "en";
      const from = url.searchParams.get("from") || "zh";

      if (!text.trim()) {
        return new Response(JSON.stringify({ error: "Text is required" }), {
          status: 400,
          headers: {
            "content-type": "application/json",
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 检查AI API是否可用
      if (!globalThis.ai) {
        return new Response(JSON.stringify({ 
          error: "AI service not available",
          fallback: "You may need to enable Cloudflare AI in your worker settings"
        }), {
          status: 503,
          headers: {
            "content-type": "application/json",
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 使用Cloudflare AI进行翻译
      const result = await globalThis.ai.run("@cf/meta/m2m100-1.2b", {
        text: text,
        source_lang: from,
        target_lang: to
      });

      if (!result || !result.translated_text) {
        throw new Error("Translation failed");
      }

      return new Response(JSON.stringify({
        translated_text: result.translated_text,
        original_text: text,
        from: from,
        to: to
      }), {
        headers: {
          "content-type": "application/json;charset=utf-8",
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      console.error('Translation error:', error);
      
      // 返回备用翻译服务或错误信息
      return new Response(JSON.stringify({
        error: "Translation failed",
        message: error.message || "Unknown error occurred",
        fallback: "Please try again later"
      }), {
        status: 500,
        headers: {
          "content-type": "application/json",
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};