let data;
fetch('data.json').then(r => r.json()).then(json => {
  data = json.programs;
  showComparator(data);
  drawKMeansChart(data);
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
});

function drawKMeansChart(programs) {
  const labels = ["Analytics", "E-commerce", "ERP"];
  const dataset = programs.map(p => ({
    label: p.name,
    data: [
      p.key_strength.toLowerCase().includes("data") ? 1 : 0,
      p.key_strength.toLowerCase().includes("e-commerce") ? 1 : 0,
      p.key_strength.toLowerCase().includes("erp") ? 1 : 0
    ],
    fill: true
  }));

  new Chart(document.getElementById('kmeansChart'), {
    type: 'radar',
    data: {
      labels,
      datasets: dataset.map(p => ({
        label: p.label,
        data: p.data,
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      elements: {
        line: {
          borderWidth: 3
        }
      }
    }
  });
}
