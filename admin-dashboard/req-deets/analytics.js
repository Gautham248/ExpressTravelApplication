document.addEventListener('DOMContentLoaded', () => {
    // Timeline JS
    const ge_currentDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const ge_apiUrl = 'https://sample-cd206-default-rtdb.firebaseio.com/.json';
    const ge_timelineChart = document.getElementById('ge-chart');
    const ge_timelineLegend = document.getElementById('ge-legend');
    const ge_timelineLoading = document.getElementById('ge-loading');
    const ge_timelineTooltip = document.getElementById('ge-tooltip');
    let ge_processedData;

    axios.get(ge_apiUrl)
        .then(response => {
            const ge_rawData = response.data.travelRequests;
            ge_timelineLoading.style.display = 'none';
            ge_timelineChart.style.display = 'block';
            ge_timelineLegend.style.display = 'flex';

            if (!ge_rawData) {
                ge_timelineLoading.textContent = 'No data available.';
                ge_timelineLoading.style.display = 'block';
                ge_timelineChart.style.display = 'none';
                ge_timelineLegend.style.display = 'none';
                return;
            }

            ge_processedData = Object.keys(ge_rawData).map(key => {
                const request = ge_rawData[key];
                let travelDate = request.travelDetails && request.travelDetails.travelDate ? new Date(request.travelDetails.travelDate) : null;
                let createdAt = request.bookingDetails && request.bookingDetails.createdAt ? new Date(request.bookingDetails.createdAt) : null;
                let status = request.bookingDetails ? request.bookingDetails.status : null;
                let closeAt = (status === 'closed' || status === 'rejected') && request.bookingDetails && request.bookingDetails.closeAt ? new Date(request.bookingDetails.closeAt) : null;

                let processingHours = 0;
                if (createdAt) {
                    if (closeAt) {
                        processingHours = (closeAt - createdAt) / (1000 * 60 * 60);
                    } else {
                        const currentDate = new Date();
                        processingHours = (currentDate - createdAt) / (1000 * 60 * 60);
                    }
                }

                return {
                    id: key,
                    travelDate: travelDate,
                    createdAt: createdAt,
                    closeAt: closeAt,
                    status: status,
                    processingHours: processingHours,
                    employeeId: request.employeeId,
                    destination: request.travelDetails ? `${request.travelDetails.destinationCity}, ${request.travelDetails.destinationCountry}` : "No Destination",
                    travelType: request.travelDetails ? request.travelType : "No Travel Type"
                };
            }).filter(item => item.travelDate !== null);

            ge_processedData.sort((a, b) => a.travelDate - b.travelDate);
            ge_renderTimelineChart();
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            ge_timelineLoading.textContent = 'Error loading data. Please try again later.';
        });

    function ge_renderTimelineChart() {
        const ge_minDate = ge_processedData.length > 0 ? new Date(Math.min(...ge_processedData.map(d => d.travelDate.getTime()))) : new Date();
        const ge_maxDate = ge_processedData.length > 0 ? new Date(Math.max(...ge_processedData.map(d => d.travelDate.getTime()))) : new Date();
        const ge_maxHours = 36;
        const ge_chartWidth = ge_timelineChart.clientWidth - 20;
        const ge_chartHeight = ge_timelineChart.clientHeight;
        const ge_yAxis = document.getElementById('ge-y-axis');
        const ge_xAxis = document.getElementById('ge-x-axis');
        ge_yAxis.innerHTML = '';
        ge_xAxis.innerHTML = '';

        for (let hours = 0; hours <= 36; hours += 6) {
            const percentage = 100 - (hours / ge_maxHours * 100);
            const yPos = (percentage / 100) * ge_chartHeight;
            if (hours > 0) {
                const gridLine = document.createElement('div');
                gridLine.className = 'ge-dashboard-grid-line';
                gridLine.style.top = `${yPos}px`;
                ge_timelineChart.appendChild(gridLine);
            }
            const label = document.createElement('div');
            label.className = 'ge-dashboard-y-axis-label';
            label.textContent = `${hours}h`;
            if (hours === 0) {
                label.style.bottom = '0';
                label.style.top = 'auto';
            } else {
                label.style.top = `${yPos - 6}px`;
            }
            ge_yAxis.appendChild(label);
        }

        const ge_getXPosition = (date) => 10 + (ge_chartWidth * ((date - ge_minDate) / (ge_maxDate - ge_minDate)));
        const ge_labeledDates = [];
        ge_processedData.forEach(request => {
            const dateKey = request.travelDate.toISOString().split('T')[0];
            if (!ge_labeledDates.includes(dateKey)) {
                ge_labeledDates.push(dateKey);
            }
        });

        ge_labeledDates.forEach(dateKey => {
            const date = new Date(dateKey);
            const xPos = ge_getXPosition(date);
            const label = document.createElement('div');
            label.className = 'ge-dashboard-x-axis-label';
            label.innerHTML = `${date.toLocaleDateString('en-US', { month: 'short' })}<br>${date.toLocaleDateString('en-US', { day: 'numeric' })}`;
            label.style.left = `${xPos}px`;
            ge_xAxis.appendChild(label);
            label.style.bottom = '-15px';
        });

        const ge_showTooltip = (e, request) => {
            const travelDateStr = request.travelDate ? request.travelDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "No Travel Date";
            const createdAtStr = request.createdAt ? request.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "No Created At";
            const closeAtStr = request.closeAt ? request.closeAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            let content = `
                <strong>ID:</strong> ${request.id}<br>
                <strong>Status:</strong> ${request.status}<br>
                <strong>Travel Date:</strong> ${travelDateStr}<br>
                <strong>Destination:</strong> ${request.destination}<br>
                <strong>Created:</strong> ${createdAtStr}<br>
                ${request.closeAt ? `<strong>Closed:</strong> ${closeAtStr}<br>` : ''}
                <strong>Processing Time:</strong> ${request.processingHours.toFixed(1)} hours
            `;
            ge_timelineTooltip.innerHTML = content;
            ge_timelineTooltip.style.left = `${e.pageX + 10}px`;
            ge_timelineTooltip.style.top = `${e.pageY - 10}px`;
            ge_timelineTooltip.style.opacity = '1';
        };

        const ge_hideTooltip = () => {
            ge_timelineTooltip.style.opacity = '0';
        };

        const ge_getStatusColor = (status) => {
            switch (status) {
                case 'closed': return '#4CAF50';
                case 'rejected': return '#F44336';
                case 'approved': return '#2196F3';
                case 'ticketed': return '#FFC107';
                default: return '#9C27B0';
            }
        };

        const ge_existingBars = ge_timelineChart.querySelectorAll('.ge-dashboard-bar');
        ge_existingBars.forEach(bar => bar.remove());

        const ge_barWidth = 12;
        const ge_barSpacing = 10;
        
        ge_processedData.forEach(request => {
            const xPos = ge_getXPosition(request.travelDate);
            const barHeight = Math.min((request.processingHours / ge_maxHours), 1) * ge_chartHeight;
            const bar = document.createElement('div');
            bar.className = 'ge-dashboard-bar';
            bar.style.backgroundColor = ge_getStatusColor(request.status);
            bar.style.left = `${xPos}px`;
            bar.style.height = `${barHeight}px`;
            bar.style.width = `${ge_barWidth}px`;
            bar.style.marginLeft = `-${ge_barWidth/2}px`;
            bar.style.borderRadius = '4px';
            bar.addEventListener('mouseover', (e) => ge_showTooltip(e, request));
            bar.addEventListener('mouseout', ge_hideTooltip);
            ge_timelineChart.appendChild(bar);
        });

        if (!document.getElementById('timeline-extra-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'timeline-extra-styles';
            styleElement.textContent = `
                .ge-dashboard-bar {
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .ge-dashboard-bar:hover {
                    transform: scaleY(1.05);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                }
                .ge-dashboard-x-axis-label {
                    margin-top: 8px;
                    font-weight: 500;
                }
                #ge-chart {
                    padding-top: 10px;
                }
            `;
            document.head.appendChild(styleElement);
        }
    }

    // Pie Chart JS
    const ge_duFilter = document.getElementById('ge-duFilter');
    const ge_pieChart = document.getElementById('ge-destinationChart').getContext('2d');
    let ge_pieChartInstance;
    let ge_allData;
    let ge_employees;
    let ge_deliveryUnits = new Set();

    fetch(ge_apiUrl)
        .then(response => response.json())
        .then(data => {
            ge_allData = data;
            ge_employees = data.employees;
            Object.values(ge_employees).forEach(employee => {
                ge_deliveryUnits.add(employee.deliveryUnit);
            });
            ge_deliveryUnits.forEach(du => {
                const option = document.createElement('option');
                option.value = du;
                option.textContent = du;
                ge_duFilter.appendChild(option);
            });
            ge_updatePieChart('all');
        })
        .catch(error => console.error('Error fetching data:', error));

    ge_duFilter.addEventListener('change', function() {
        ge_updatePieChart(this.value);
    });

    function ge_updatePieChart(selectedDU) {
        const travelRequests = ge_allData.travelRequests;
        let countryCounts = {};
        let totalTrips = 0;

        Object.keys(travelRequests).forEach(requestId => {
            const request = travelRequests[requestId];
            const employeeId = request.employeeId;
            const employee = ge_employees[employeeId];

            if (!employee) return;
            if (selectedDU !== 'all' && employee.deliveryUnit !== selectedDU) return;
            if (request.bookingDetails && request.bookingDetails.status !== 'closed') return;

            if (request.travelDetails && request.travelDetails.destinationCountry) {
                const destinationCountry = request.travelDetails.destinationCountry;
                countryCounts[destinationCountry] = (countryCounts[destinationCountry] || 0) + 1;
                totalTrips++;
            }
        });

        const sortedCountries = Object.keys(countryCounts).sort((a, b) => countryCounts[b] - countryCounts[a]);
        const chartLabels = sortedCountries;
        const chartData = sortedCountries.map(country => countryCounts[country]);
        const backgroundColors = ge_generateColors(sortedCountries.length);

        if (ge_pieChartInstance) {
            ge_pieChartInstance.destroy();
        }

        ge_pieChartInstance = new Chart(ge_pieChart, {
            type: 'pie',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: `Travel Distribution by Destination Country (Closed) ${selectedDU === 'all' ? '' : '(DU: ' + selectedDU + ')'}`,
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = Math.round((value / totalTrips) * 100);
                                return `${label}: ${value} trips (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function ge_generateColors(count) {
        const colors = [];
        const hueStep = 360 / count;
        for (let i = 0; i < count; i++) {
            const hue = i * hueStep;
            colors.push(`hsl(${hue}, 70%, 60%)`);
        }
        return colors;
    }

    // Filter Chart JS
    let ge_filterTravelRequests = {};
    let ge_duCounts = { "DU1": 0, "DU2": 0, "DU3": 0, "DU4": 0, "DU5": 0 };
    let ge_duChart, ge_statusChart;
    let ge_filterEmployees = {};
    let ge_selectedDU = null;
    let ge_filterResponseData = {};

    async function ge_fetchFilterData() {
        try {
            const response = await axios.get(ge_apiUrl);
            ge_filterResponseData = response.data;
            ge_filterTravelRequests = ge_filterResponseData.travelRequests;
            ge_filterEmployees = ge_filterResponseData.employees;
            ge_processFilterData();
            ge_renderFilterChart();
            ge_setInitialDateFilters();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    function ge_processFilterData() {
        for (const du in ge_duCounts) {
            ge_duCounts[du] = 0;
        }
        for (const requestId in ge_filterTravelRequests) {
            const request = ge_filterTravelRequests[requestId];
            const employeeId = request.employeeId;
            if (employeeId && ge_filterEmployees[employeeId]) {
                const du = ge_filterEmployees[employeeId].deliveryUnit;
                if (ge_duCounts[du] !== undefined) {
                    ge_duCounts[du]++;
                }
            }
        }
    }

    function ge_renderFilterChart() {
        const ctx = document.getElementById('ge-duChart').getContext('2d');
        const duNames = Object.keys(ge_duCounts);
        const counts = Object.values(ge_duCounts);

        if (ge_duChart) {
            ge_duChart.destroy();
        }

        ge_duChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: duNames,
                datasets: [{
                    label: 'Travel Requests by DU',
                    data: counts,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: { y: { beginAtZero: true, precision: 0, ticks: { stepSize: 1 } } },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const clickedIndex = elements[0].index;
                        ge_selectedDU = duNames[clickedIndex];
                        ge_renderStatusChart(ge_selectedDU);
                        ge_showStatusChart();
                    }
                }
            }
        });
    }

    function ge_renderStatusChart(du) {
        const statusCounts = { pending: 0, approved: 0, ticketed: 0, rejected: 0, closed: 0 };
        for (const requestId in ge_filterTravelRequests) {
            const request = ge_filterTravelRequests[requestId];
            const employeeId = request.employeeId;
            if (employeeId && ge_filterEmployees[employeeId] && ge_filterEmployees[employeeId].deliveryUnit === du) {
                const status = request.bookingDetails.status;
                if (statusCounts[status] !== undefined) {
                    statusCounts[status]++;
                }
            }
        }
        const ctx = document.getElementById('ge-statusChart').getContext('2d');
        if (ge_statusChart) {
            ge_statusChart.destroy();
        }
        ge_statusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    label: `Status for ${du}`,
                    data: Object.values(statusCounts),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true, precision: 0, ticks: { stepSize: 1 } } } }
        });
    }

    function ge_updateChart() {
        const startDateInput = document.getElementById('ge-startDate').value;
        const endDateInput = document.getElementById('ge-endDate').value;
        const startDate = startDateInput ? new Date(startDateInput) : null;
        const endDate = endDateInput ? new Date(endDateInput) : null;

        for (const du in ge_duCounts) {
            ge_duCounts[du] = 0;
        }

        for (const requestId in ge_filterTravelRequests) {
            const request = ge_filterTravelRequests[requestId];
            const createdAt = new Date(request.bookingDetails.createdAt);

            if ((!startDate || createdAt >= startDate) && (!endDate || createdAt <= endDate)) {
                const employeeId = request.employeeId;
                if (employeeId && ge_filterEmployees[employeeId]) {
                    const du = ge_filterEmployees[employeeId].deliveryUnit;
                    if (ge_duCounts[du] !== undefined) {
                        ge_duCounts[du]++;
                    }
                }
            }
        }
        ge_renderFilterChart();
    }

    function ge_setInitialDateFilters() {
        let oldestDate = null;
        let newestDate = null;

        for (const requestId in ge_filterTravelRequests) {
            const createdAt = new Date(ge_filterTravelRequests[requestId].bookingDetails.createdAt);
            if (!oldestDate || createdAt < oldestDate) {
                oldestDate = createdAt;
            }
            if (!newestDate || createdAt > newestDate) {
                newestDate = createdAt;
            }
        }

        if (oldestDate) {
            const oldestDateString = oldestDate.toISOString().split('T')[0];
            document.getElementById('ge-startDate').value = oldestDateString;
        }
        if (newestDate) {
            const newestDateString = newestDate.toISOString().split('T')[0];
            document.getElementById('ge-endDate').value = newestDateString;
        }
    }

    function ge_showStatusChart() {
        document.getElementById('ge-chartContainer').style.display = 'none';
        document.getElementById('ge-statusChartContainer').style.display = 'block';
    }

    function ge_showDUChart() {
        document.getElementById('ge-chartContainer').style.display = 'block';
        document.getElementById('ge-statusChartContainer').style.display = 'none';
    }

    document.getElementById('ge-startDate').addEventListener('change', ge_updateChart);
    document.getElementById('ge-endDate').addEventListener('change', ge_updateChart);
    document.querySelector('#ge-statusChartContainer button').addEventListener('click', ge_showDUChart);

    ge_fetchFilterData();
});