let data;
fetch('data.json').then(r => r.json()).then(json => {
  data = json.programs;
  showComparator(data);
  runKMeans(data);
});

// Comparator & search logic
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

// K-means clustering (2D: [specialized_courses.length, career_outcomes.length])
function runKMeans(programs) {
  // Feature extraction
  const points = programs.map(p => ({
    x: p.specialized_courses.length,
    y: p.career_outcomes.length,
    label: p.name
  }));

  // Simple K-means (k=2, random init, 5 iterations)
  const k = 2;
  let centroids = [
    {x: points[0].x, y: points[0].y},
    {x: points[1 % points.length].x, y: points[1 % points.length].y}
  ];
  let assignments = new Array(points.length);
  for(let iter=0; iter<5; iter++) {
    // Assign clusters
    for(let i=0; i<points.length; i++) {
      let dists = centroids.map(c => Math.pow(points[i].x-c.x,2)+Math.pow(points[i].y-c.y,2));
      assignments[i] = dists[0] < dists[1] ? 0 : 1;
    }
    // Update centroids
    for(let j=0; j<k; j++) {
      let cluster = points.filter((_,i) => assignments[i]===j);
      if(cluster.length) {
        centroids[j] = {
          x: cluster.reduce((sum,p)=>sum+p.x,0)/cluster.length,
          y: cluster.reduce((sum,p)=>sum+p.y,0)/cluster.length
        };
      }
    }
  }

  // Prepare Chart.js datasets
  const clusterColors = ['#285cc4', '#c4285c'];
  const datasets = [];
  for(let j=0; j<k; j++) {
    datasets.push({
      label: "Cluster "+(j+1),
      data: points.filter((_,i)=>assignments[i]===j),
      backgroundColor: clusterColors[j],
      pointRadius: 10,
      showLine: false
    });
  }

  // Draw chart
  const ctx = document.getElementById('kmeansChart').getContext('2d');
  if (window.kmeansChartObj) window.kmeansChartObj.destroy();
  window.kmeansChartObj = new Chart(ctx, {
    type: 'scatter',
    data: {datasets},
    options: {
      plugins: {
        legend: {display: true},
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.raw.label}: SpecCourses=${ctx.raw.x}, Careers=${ctx.raw.y}`
          }
        }
      },
      scales: {
        x: {title: {display: true, text: 'Specialized Courses Count'}, beginAtZero: true},
        y: {title: {display: true, text: 'Career Outcomes Count'}, beginAtZero: true}
      }
    }
  });
}

// Optionally, re-run clustering/chart on "Refresh Chart" button
document.getElementById('refreshChartBtn')?.addEventListener('click', () => {
  runKMeans(data);
});
