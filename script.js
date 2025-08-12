let data;
fetch('data.json').then(r => r.json()).then(json => {
  data = json.programs;
  showComparator(data);
  runKMeans(data);
});

const comparator = document.getElementById('comparator');
const searchbox = document.getElementById('searchbox');
if (searchbox) {
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
}

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

// Dynamically extract relevant features for clustering
function extractFeatures(programs) {
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

// Classic JS k-means implementation (no TensorFlow)
function euclidean(a, b) {
  let sum = 0;
  for(let i=0; i<a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function kMeansClassic(features, k, maxIter=30) {
  const n = features.length;
  // Randomly pick k initial centroids
  let centroids = [];
  const usedIdx = new Set();
  while (centroids.length < k) {
    let idx = Math.floor(Math.random() * n);
    if (!usedIdx.has(idx)) {
      centroids.push(features[idx].slice());
      usedIdx.add(idx);
    }
  }
  let assignments = new Array(n).fill(0);

  for(let iter=0; iter<maxIter; iter++) {
    // Assign clusters
    assignments = features.map(f => {
      let minDist = Infinity, minIdx = 0;
      for(let i=0; i<k; i++) {
        let d = euclidean(f, centroids[i]);
        if(d < minDist) {
          minDist = d;
          minIdx = i;
        }
      }
      return minIdx;
    });

    // Update centroids
    let newCentroids = Array.from({length: k}, () => Array(features[0].length).fill(0));
    let counts = Array(k).fill(0);
    for(let i=0; i<n; i++) {
      const cluster = assignments[i];
      for(let j=0; j<features[0].length; j++) {
        newCentroids[cluster][j] += features[i][j];
      }
      counts[cluster]++;
    }
    for(let i=0; i<k; i++) {
      if(counts[i] === 0) {
        // Reinitialize to random point
        newCentroids[i] = features[Math.floor(Math.random() * n)].slice();
      } else {
        for(let j=0; j<features[0].length; j++) {
          newCentroids[i][j] /= counts[i];
        }
      }
    }
    centroids = newCentroids;
  }
  return { centroids, assignments };
}

// Run k-means clustering and visualize clusters
function runKMeans(programs) {
  const features = extractFeatures(programs);
  const k = Math.min(3, programs.length);

  const { centroids, assignments } = kMeansClassic(features, k);

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

// No TensorFlow.js code remains in this file!
