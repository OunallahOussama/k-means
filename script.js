let data;
fetch('data.json').then(r => r.json()).then(json => {
  data = json.programs;
  showComparator(data);
  runKMeans(data);
});

const comparator = document.getElementById('comparator');
const searchbox = document.getElementById('searchbox');

function showComparator(programs) {
  comparator.innerHTML = `
    <table class="table table-bordered table-hover align-middle">
      <thead class="table-primary">
        <tr>
          <th>Program</th>
          <th>Main Focus</th>
          <th>Key Strength</th>
          <th>Specialized Courses</th>
          <th>Career Outcomes</th>
        </tr>
      </thead>
      <tbody>
        ${programs.map(p => `
          <tr>
            <td class="fw-bold">${p.name}</td>
            <td>${p.core_objective}</td>
            <td>${p.key_strength}</td>
            <td>${p.specialized_courses.join(", ")}</td>
            <td>${p.career_outcomes.join(", ")}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

searchbox.addEventListener('input', function() {
  const q = this.value.toLowerCase();
  const filtered = data.filter(p =>
    p.core_objective.toLowerCase().includes(q) ||
    p.key_strength.toLowerCase().includes(q) ||
    p.specialized_courses.some(c => c.toLowerCase().includes(q)) ||
    p.career_outcomes.some(c => c.toLowerCase().includes(q))
  );
  showComparator(filtered.length ? filtered : data);
  runKMeans(filtered.length ? filtered : data);
});

/**
 * Dynamically extract relevant features for clustering
 */
function extractFeatures(programs) {
  const featureSet = [
    "data", "analytics", "e-commerce", "erp", "business", "ai", "marketing", "finance", "cloud"
  ];
  return programs.map(p => {
    // vector presence for each feature in key_strength + core_objective + courses
    let text = [p.key_strength, p.core_objective, ...p.specialized_courses].join(" ").toLowerCase();
    return featureSet.map(f => text.includes(f) ? 1 : 0);
  });
}

/**
 * Run k-means clustering using TensorFlow.js and visualize clusters
 */
async function runKMeans(programs) {
  // Dynamically import tensorflow.js if not loaded
  if (!window.tf) {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.18.0/dist/tf.min.js');
  }

  // Features extraction
  const features = extractFeatures(programs);
  const k = Math.min(3, programs.length); // choose 3 clusters or as many as programs

  // Convert features to tensor
  const xs = tf.tensor2d(features);

  // K-means clustering function
  const { centroids, assignments } = await kMeans(xs, k);

  // Prepare data for chart.js scatter plot
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#8AFF33", "#A233FF"];
  const datasets = Array.from({length: k}, (_, i) => ({
    label: `Cluster ${i+1}`,
    data: [],
    backgroundColor: colors[i % colors.length],
    pointRadius: 8
  }));

  assignments.forEach((clusterIdx, i) => {
    // Use first two principal features for scatter plot
    datasets[clusterIdx].data.push({
      x: features[i][0] + features[i][1]*0.2, // "data"/"analytics"
      y: features[i][2] + features[i][3]*0.2, // "e-commerce"/"erp"
      program: programs[i].name
    });
  });

  // Destroy previous chart if any
  if (window.kmeansChartObj) window.kmeansChartObj.destroy();

  // Scatter plot visualization
  window.kmeansChartObj = new Chart(document.getElementById('kmeansChart'), {
    type: 'scatter',
    data: { datasets },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.raw.program;
            }
          }
        }
      },
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Data/Analytics' },
          min: -0.2, max: 1.2, ticks: { stepSize: 1 }
        },
        y: {
          title: { display: true, text: 'E-commerce/ERP' },
          min: -0.2, max: 1.2, ticks: { stepSize: 1 }
        }
      }
    }
  });
}

/**
 * Simple K-means implementation for TF.js tensors
 */
async function kMeans(xs, k, maxIter = 30) {
  const n = xs.shape[0];
  // Randomly initialize centroids
  let centroids = xs.gather(tf.util.createShuffledIndices(n).slice(0, k));
  let assignments = new Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign each sample to nearest centroid
    const dists = tf.tidy(() => {
      // [n, k]: dist(row, centroid)
      return xs.expandDims(1).sub(centroids.expandDims(0)).pow(2).sum(-1);
    });
    assignments = await dists.argMin(1).array();

    // Update centroids
    let newCentroids = [];
    for (let i = 0; i < k; i++) {
      const idxs = assignments.map((a, j) => a === i ? j : -1).filter(j => j !== -1);
      if (idxs.length === 0) {
        // Reinitialize centroid if no points assigned
        newCentroids.push(xs.gather([Math.floor(Math.random() * n)]));
      } else {
        newCentroids.push(xs.gather(idxs).mean(0));
      }
    }
    centroids = tf.stack(newCentroids);
  }
  return { centroids, assignments };
}

// Helper: Load external script dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
