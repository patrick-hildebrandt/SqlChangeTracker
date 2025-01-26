document.addEventListener('DOMContentLoaded', () => {
    startFetchingChanges();
});

function startFetchingChanges() {
    fetchChanges(); // Initialer Aufruf
    setInterval(fetchChanges, 2000); // Alle 2 Sekunden wiederholen
}

function fetchChanges() {
    fetch('/api/changes')
        .then(response => response.json())
        .then(data => {
            // Wenn data selbst schon ein Array ist:
            if (Array.isArray(data)) {
                displayChanges(data);
            }
            // Falls data ein Objekt { changes: [...] } ist:
            else if (data && Array.isArray(data.changes)) {
                displayChanges(data.changes);
            } else {
                console.error('Unerwartetes Datenformat:', data);
            }
        })
        .catch(error => console.error('Error:', error));
}

function displayChanges(data) {
  const tableBody = document.getElementById('logTable');
  tableBody.innerHTML = '';

  data.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${entry.id}</td>
      <td>${entry.table_name}</td>
      <td>${entry.change_type}</td>
      <td>${entry.change_date}</td>
      <td>${entry.changed_by}</td>
      <td>${renderDetails(entry.details)}</td>
      `;
      tableBody.appendChild(row);
  });
}

function renderDetails(details) {
  console.log(details);
  if (!details) return "Keine Details verfügbar";
  let parsed = (typeof details === "string") ? JSON.parse(details) : details;
  for (const key in parsed) {
    if (typeof parsed[key] === "string") {
      parsed[key] = parsed[key].trim();
    }
  }
  let jsonString = JSON.stringify(parsed, null, 2);
  jsonString = jsonString.replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>');
  jsonString = jsonString.replace(/[",]/g, '');
  return `<span>${jsonString}</span>`;
}