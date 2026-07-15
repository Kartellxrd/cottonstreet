// js/admin/admin-intel.js

// --- NLP Rules Mapping ---
// Note: Category matching supports both string IDs/names and typical database primary key associations (e.g. 1, 2, 3, 4)
const PRODUCT_NLP_RULES = [
  {
    category: 'clothing', // Matches backend category IDs or values
    categoryIdFallback: 1, // Common auto-increment primary key ID fallback
    keywords: ['nike', 'adidas', 'hoodie', 'tee', 'shirt', 'pants', 'cargo', 'jacket', 'fleece', 'jeans', 'essentials', 'gallery', 'dept', 'apparel'],
    defaultVariant: 'Premium Cotton Blend • Standard Fit',
    suggestedBadge: 'NEW'
  },
  {
    category: 'tech-phones',
    categoryIdFallback: 2,
    keywords: ['iphone', 'apple', 'pro', 'max', 'samsung', 'galaxy', 'charger', 'buds', 'airpods', 'case', 'watch', 'tech', 'adapter'],
    defaultVariant: '100% Battery Health • Unlocked • Pristine Condition',
    suggestedBadge: 'HOT'
  },
  {
    category: 'drip-gear',
    categoryIdFallback: 3,
    keywords: ['jordan', 'yeezy', 'glide', 'nocta', 'sneaker', 'shoe', 'slide', 'bape', 'croc', 'clog', 'boot', 'dunk', 'force'],
    defaultVariant: 'All Sizes Available • Brand New in Box',
    suggestedBadge: 'TRENDING'
  },
  {
    category: 'athletic',
    categoryIdFallback: 4,
    keywords: ['jersey', 'tracksuit', 'kit', 'chelsea', 'madrid', 'arsenal', 'united', 'fc', 'retro', 'sportswear'],
    defaultVariant: 'Player Version • Dri-Fit Tech',
    suggestedBadge: 'NEW'
  }
];

/**
 * Predicts category, variant, and badge recommendations based on a product name.
 * @param {string} val 
 * @returns {object|null}
 */
export function classifyProductName(val) {
  const cleanVal = val.toLowerCase().trim();
  if (cleanVal.length < 3) return null;

  let matched = null;
  let maxScore = 0;

  PRODUCT_NLP_RULES.forEach(rule => {
    let score = 0;
    rule.keywords.forEach(kw => {
      if (cleanVal.includes(kw)) score += 2;
      if (cleanVal.split(/\s+/).includes(kw)) score += 1;
    });
    if (score > maxScore) {
      maxScore = score;
      matched = rule;
    }
  });

  return matched && maxScore > 1 ? matched : null;
}

/**
 * Compresses an image file using an HTML5 Canvas down to JPEG format.
 * @param {File} file 
 * @returns {Promise<File>}
 */
export async function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.75); // 75% quality sweet spot
      };
    };
  });
}

/**
 * Analyzes Botswana delivery towns to calculate regional hotspots.
 * @param {Array} orders 
 * @returns {Array} List of hotspots sorted by order frequency
 */
export function calculateGeographicHotspots(orders) {
  const counts = {};
  let total = 0;

  orders.forEach(order => {
    if (order.customer_town) {
      const town = order.customer_town.trim();
      counts[town] = (counts[town] || 0) + 1;
      total++;
    }
  });

  return Object.keys(counts).map(town => ({
    town: town,
    percentage: total > 0 ? Math.round((counts[town] / total) * 100) : 0,
    count: counts[town]
  })).sort((a, b) => b.count - a.count);
}