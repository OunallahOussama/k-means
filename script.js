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

// Only use Specialized Courses and Career Outcomes for clustering
function extractFeatures(programs) {
  // Collect all unique specialized courses and career outcomes
  const allCourses = new Set();
  const allOutcomes = new Set();
  programs.forEach(p => {
    (p.specialized_courses || []).forEach(c => allCourses.add(c.trim().toLowerCase()));
    (p.career_outcomes || []).forEach(o => allOutcomes.add(o.trim().toLowerCase()));
  });

  // Feature set is the union of all unique values
  const featureSet = Array.from(new Set([...allCourses, ...allOutcomes]));

  // Build binary feature vectors for each program
  return programs.map(p => {
    const values = [
      ...(p.specialized_courses || []).map(x => x.trim().toLowerCase()),
      ...(p.career_outcomes || []).map(x => x.trim().toLowerCase())
    ];
    return featureSet.map(f => values.includes(f) ? 1 : 0);
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

  // For scatter plot, pick first two features (may be arbitrary but shows separation)
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#8AFF33", "#A233FF"];
  const datasets = Array.from({length: k}, (_, i) => ({
    label: `Cluster ${i+1}`,
    data: [],
    backgroundColor: colors[i % colors.length],
    pointRadius: 10
  }));

  assignments.forEach((clusterIdx, i) => {
    datasets[clusterIdx].data.push({
      x: features[i][0], // featureSet[0]
      y: features[i][1], // featureSet[1]
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
          title: { display: true, text: 'Feature: ' + (window.featureSetName0 || 'Specialized/Career 1') },
          min: -0.2, max: 1.2, ticks: { stepSize: 1 }
        },
        y: {
          title: { display: true, text: 'Feature: ' + (window.featureSetName1 || 'Specialized/Career 2') },
          min: -0.2, max: 1.2, ticks: { stepSize: 1 }
        }
      }
    }
  });

  // Optionally update feature names for axis labels
  if (features.length && features[0].length >= 2) {
    window.featureSetName0 = getFeatureName(0, programs);
    window.featureSetName1 = getFeatureName(1, programs);
  }
}

// Helper to get feature name for axis labels
function getFeatureName(idx, programs) {
  const allCourses = new Set();
  const allOutcomes = new Set();
  programs.forEach(p => {
    (p.specialized_courses || []).forEach(c => allCourses.add(c.trim().toLowerCase()));
    (p.career_outcomes || []).forEach(o => allOutcomes.add(o.trim().toLowerCase()));
  });
  const featureSet = Array.from(new Set([...allCourses, ...allOutcomes]));
  return featureSet[idx] || "";
}

// No TensorFlow.js code remains in this file!
