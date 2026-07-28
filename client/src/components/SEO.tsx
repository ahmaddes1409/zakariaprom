import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  schema?: object | object[];
}

export default function SEO({ title, description, keywords, image, url, schema }: SEOProps) {
  useEffect(() => {
    // 1. Title
    if (title) {
      document.title = title;
    }

    // 2. Meta description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    // 3. Meta keywords
    if (keywords) {
      let metaKw = document.querySelector('meta[name="keywords"]');
      if (!metaKw) {
        metaKw = document.createElement('meta');
        metaKw.setAttribute('name', 'keywords');
        document.head.appendChild(metaKw);
      }
      metaKw.setAttribute('content', keywords);
    }

    // 4. Canonical URL
    const targetUrl = url || window.location.href;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', targetUrl);

    // 5. OpenGraph Tags
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
    }
    if (description) {
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
    }
    if (image) {
      let ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute('content', image);
    }
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', targetUrl);

    // 6. Twitter Tags
    if (title) {
      let twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle) twTitle.setAttribute('content', title);
    }
    if (description) {
      let twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute('content', description);
    }
    if (image) {
      let twImg = document.querySelector('meta[name="twitter:image"]');
      if (twImg) twImg.setAttribute('content', image);
    }

    // 7. JSON-LD Schema
    if (schema) {
      let script = document.getElementById('dynamic-json-ld');
      if (!script) {
        script = document.createElement('script');
        script.id = 'dynamic-json-ld';
        script.setAttribute('type', 'application/ld+json');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    }
  }, [title, description, keywords, image, url, schema]);

  return null;
}
