// Bloom 2026 - Week Grid Logic

(function() {
    'use strict';

    // Calculate current week of 2026
    function getCurrentWeek() {
        const now = new Date();
        const year = now.getFullYear();

        // If we're not in 2026 yet, show week 1 as current for demo
        // If we're past 2026, show all weeks as bloomed
        if (year < 2026) {
            return 0; // Before 2026 starts - nothing bloomed yet
        }
        if (year > 2026) {
            return 53; // After 2026 - all weeks bloomed
        }

        // We're in 2026 - calculate the actual week
        const startOf2026 = new Date(2026, 0, 1); // Jan 1, 2026
        const diffMs = now - startOf2026;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const weekNumber = Math.floor(diffDays / 7) + 1;

        return Math.min(weekNumber, 52);
    }

    // Update affirmation display
    function updateAffirmation(week) {
        const affirmationEl = document.getElementById('affirmationText');
        if (affirmationEl && typeof AFFIRMATIONS !== 'undefined') {
            const index = Math.max(0, Math.min(week - 1, 51)); // 0-indexed, capped at 51
            affirmationEl.textContent = `"${AFFIRMATIONS[index]}"`;
        }
    }

    // Generate week grid
    function renderGrid() {
        const grid = document.getElementById('weekGrid');
        const currentWeek = getCurrentWeek();

        // Update progress info
        document.getElementById('currentWeek').textContent = Math.max(1, currentWeek);
        document.getElementById('progressPercent').textContent = Math.round((Math.max(0, currentWeek - 1) / 52) * 100);

        // Update affirmation
        updateAffirmation(Math.max(1, currentWeek));

        // Clear existing grid
        grid.innerHTML = '';

        // Create 52 week dots
        for (let week = 1; week <= 52; week++) {
            const dot = document.createElement('div');
            dot.className = 'week-dot';
            dot.setAttribute('data-week', `Week ${week}`);

            if (week < currentWeek) {
                // Past weeks - bloomed
                dot.classList.add('bloomed');
            } else if (week === currentWeek) {
                // Current week
                dot.classList.add('current');
            } else {
                // Future weeks
                dot.classList.add('upcoming');
            }

            grid.appendChild(dot);
        }
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', renderGrid);

})();
