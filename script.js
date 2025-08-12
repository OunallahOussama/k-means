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
            <td>${p.main_focus}</td>
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

// Dynamically extract relevant features for clustering
function extractFeatures(programs) {
  // Update features based on your new JSON
  const featureSet = [
    "analytics","data","e-commerce","erp","crm","web","governance","forecasting","integration"
  ];
  return programs.map(p => {
    let text = [
      p.key_strength, p.core_objective, p.main_focus,
      ...p.specialized_courses,
      ...p.data_and_analytics,
      ...p.e_commerce_focus,
      p.systems_integration,
      p.programming_focus,
      p.business_emphasis,
      ...p.key_courses || [],
      ...p.decision_sciences || [],
      ...p.soft_skills || []
    ].join(" ").toLowerCase();
    return featureSet.map(f => text.includes(f) ? 1 : 0);
  });
}

// Run k-means clustering using TensorFlow.js and visualize clusters
async function runKMeans(programs) {
  if (!window.tf) {
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.18.0/dist/tf.min.js');
  }
  const features = extractFeatures(programs);
  const k = Math.min(3, programs.length);

  const xs = tf.tensor2d(features);
  const { centroids, assignments } = await kMeans(xs, k);

  // Use first two features for scatter plot: "analytics" and "e-commerce"
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#8AFF33", "#A233FF"];
  const datasets = Array.from({length: k}, (_, i) => ({
    label: `Cluster ${i+1}`,
    data: [],
    backgroundColor: colors[i % colors.length],
    pointRadius: 10
  }));

  assignments.forEach((clusterIdx, i) => {
    datasets[clusterIdx].data.push({
      x: features[i][0] + features[i][2]*0.5, // analytics + e-commerce
      y: features[i][3] + features[i][1]*0.5, // erp + data
      program: programs[i].name
    });
  });

  if (window.kmeansChartObj) window.kmeansChartObj.destroy();

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
          title: { display: true, text: 'Analytics / E-commerce' },
          min: -0.2, max: 2.2, ticks: { stepSize: 1 }
        },
        y: {
          title: { display: true, text: 'ERP / Data' },
          min: -0.2, max: 2.2, ticks: { stepSize: 1 }
        }
      }
    }
  });
}

// Simple K-means implementation for TF.js tensors
async function kMeans(xs, k, maxIter = 30) {
  const n = xs.shape[0];
  let centroids = xs.gather(tf.util.createShuffledIndices(n).slice(0, k));
  let assignments = new Array(n).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const dists = tf.tidy(() => xs.expandDims(1).sub(centroids.expandDims(0)).pow(2).sum(-1));
    assignments = await dists.argMin(1).array();
    let newCentroids = [];
    for (let i = 0; i < k; i++) {
      const idxs = assignments.map((a, j) => a === i ? j : -1).filter(j => j !== -1);
      if (idxs.length === 0) {
        newCentroids.push(xs.gather([Math.floor(Math.random() * n)]));
      } else {
        newCentroids.push(xs.gather(idxs).mean(0));
      }
    }
    centroids = tf.stack(newCentroids);
  }
  return { centroids, assignments };
}

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
