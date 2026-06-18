document.addEventListener('DOMContentLoaded', async () => {
    const loadingEl = document.getElementById('loading');
    const dashboardEl = document.getElementById('dashboard');
    const yellowBody = document.getElementById('yellowCardsBody');
    const cornersBody = document.getElementById('cornersBody');
    const exportBtn = document.getElementById('exportBtn');

    const leagueSelect = document.getElementById('leagueSelect');
    const seasonSelect = document.getElementById('seasonSelect');
    const leagueTitle = document.getElementById('leagueTitle');
    const seasonBadge = document.getElementById('seasonBadge');

    // Parse URL parameters for initial load
    const urlParams = new URLSearchParams(window.location.search);
    const initialLeagueId = urlParams.get('leagueId') || '140';
    const initialSeason = urlParams.get('season') || '2024';
    
    // Set initial select values if they exist in the options
    if (leagueSelect.querySelector(`option[value="${initialLeagueId}"]`)) {
        leagueSelect.value = initialLeagueId;
    }
    if (seasonSelect.querySelector(`option[value="${initialSeason}"]`)) {
        seasonSelect.value = initialSeason;
    }

    // Setup Export Button
    exportBtn.addEventListener('click', () => {
        const leagueId = leagueSelect.value;
        const season = seasonSelect.value;
        window.location.href = `/api/v1/statistics/${leagueId}/${season}/export`;
    });

    // Listen for changes
    const onChange = () => {
        const leagueId = leagueSelect.value;
        const season = seasonSelect.value;
        
        // Update Title & Badge
        const leagueName = leagueSelect.options[leagueSelect.selectedIndex].text;
        leagueTitle.textContent = `${leagueName} Analytics`;
        seasonBadge.textContent = `SEASON ${season}`;
        
        fetchData(leagueId, season);
    };

    leagueSelect.addEventListener('change', onChange);
    seasonSelect.addEventListener('change', onChange);

    async function fetchData(leagueId, season) {
        // Show loading
        dashboardEl.classList.add('hidden');
        loadingEl.classList.remove('hidden');
        loadingEl.innerHTML = `
            <div class="spinner"></div>
            <p>Fetching latest match data...</p>
        `;

        const apiUrl = `/api/v1/statistics/${leagueId}/${season}`;

        try {
            // Fetch JSON from API. Ensure Accept header is json so it doesn't redirect!
            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const data = await response.json();

            // Clear previous data
            yellowBody.innerHTML = '';
            cornersBody.innerHTML = '';

            // Render Yellow Cards
            if (data.averageYellowCards && data.averageYellowCards.length > 0) {
                data.averageYellowCards.forEach((stat, index) => {
                    const tr = document.createElement('tr');
                    tr.className = 'data-row';
                    // Staggered animation delay
                    tr.style.animationDelay = `${index * 0.05}s`;
                    
                    tr.innerHTML = `
                        <td>#${index + 1}</td>
                        <td>${stat.team}</td>
                        <td>${stat.matchesPlayed}</td>
                        <td>${stat.averageYellowCards.toFixed(2)}</td>
                    `;
                    yellowBody.appendChild(tr);
                });
            } else {
                yellowBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No data available</td></tr>`;
            }

            // Render Corners
            if (data.totalCorners && data.totalCorners.length > 0) {
                data.totalCorners.forEach((stat, index) => {
                    const tr = document.createElement('tr');
                    tr.className = 'data-row';
                    // Staggered animation delay
                    tr.style.animationDelay = `${index * 0.05}s`;
                    
                    tr.innerHTML = `
                        <td>#${index + 1}</td>
                        <td>${stat.team}</td>
                        <td>${stat.matchesPlayed}</td>
                        <td>${stat.corners}</td>
                    `;
                    cornersBody.appendChild(tr);
                });
            } else {
                cornersBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No data available</td></tr>`;
            }

            // Hide loading, show dashboard
            loadingEl.classList.add('hidden');
            dashboardEl.classList.remove('hidden');

        } catch (error) {
            console.error('Error fetching statistics:', error);
            loadingEl.innerHTML = `
                <div style="color: var(--neon-pink); text-align: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 10px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <p>Failed to load statistics. Please try again later.</p>
                </div>
            `;
        }
    }

    // Initial fetch
    onChange();
});
