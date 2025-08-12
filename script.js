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

// ... rest of JS-native k-means code ...
