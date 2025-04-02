document.addEventListener('DOMContentLoaded', () => {
    // ######################################---ADVAIT---##############################################################

    // URL targeting the specific "travelRequests" and "managers" table
    const TravelRequest_DB = 'https://sample-cd206-default-rtdb.firebaseio.com/travelRequests.json';
    const Manager_DB = 'https://sample-cd206-default-rtdb.firebaseio.com/managers.json';

    
    const sourceCountry = document.getElementById('source-country');
    const sourceCity = document.getElementById('source-city');
    const destinationCountry = document.getElementById('destination-country');
    const destinationCity = document.getElementById('destination-city');
    const projectCode = document.getElementById('project-code');
    const reportingManager = document.getElementById('reporting-manager');
    const travelDate = document.getElementById('travel-date');
    const international = document.getElementById('international');
    const domestic = document.getElementById('domestic');
    const submitButton = document.getElementById('submit-button');

    // Set the minimum date for the travel date field to today
    const today = new Date().toISOString().split('T')[0];
    if(travelDate){
        travelDate.setAttribute('min', today);
        travelDate.addEventListener('keydown', (e) => e.preventDefault());
    }

    // Function to get travel type
    function getTravelType() {
        return international.checked ? 'international' : 'domestic';
    }

    // Function to generate a unique request ID
    function generateRequestId() {
        return `TR-${Date.now()}`;
    }

    // Function to get the current timestamp
    function getCurrentTimestamp() {
        const now = new Date();

        // Format date as YYYY-MM-DD
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        // Format time as HH:MM:SS
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // Function to validate travel date
    function isValidTravelDate(date) {
        const today = new Date().setHours(0, 0, 0, 0);
        const selectedDate = new Date(date).setHours(0, 0, 0, 0);
        return selectedDate >= today;
    }

    // Function to get manager ID from email
    async function getManagerIdByEmail(email) {
        try {
            const response = await axios.get(Manager_DB);
            const managers = response.data;
            if (managers) {
                for (const [id, manager] of Object.entries(managers)) {
                    if (manager.email === email) {
                        return id;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching manager data:', error);
            alert('Error fetching manager data. Please try again.');
        }
        return null;
    }

    // Function to create a travel request object
    async function createTravelRequest() {
        console.log('Inside createTravelRequest function...');
        const requestId = generateRequestId();
        const managerEmail = reportingManager.value;
        const managerId = await getManagerIdByEmail(managerEmail);

        if (!managerId) {
            alert('Could not find manager with that email.');
            return null;
        }

        return {
            [requestId]: {
                bookingDetails: {
                    createdAt: getCurrentTimestamp(),
                    status: 'pending'
                },
                employeeId: 'E456',
                managerId: managerId,
                ticketDetails: {
                    optionTickets: null,
                    selectedTicket: null
                },
                travelDetails: {
                    sourceCountry: sourceCountry.value,
                    sourceCity: sourceCity.value,
                    destinationCountry: destinationCountry.value,
                    destinationCity: destinationCity.value,
                    projectCode: projectCode.value,
                    travelDate: travelDate.value,
                    travelType: getTravelType()
                }
            }
        };
    }

    // Function to clear form fields
    function clearForm() {
        sourceCountry.value = '';
        sourceCity.value = '';
        destinationCountry.value = '';
        destinationCity.value = '';
        projectCode.value = '';
        reportingManager.value = '';
        travelDate.value = '';
        domestic.checked = true;
    }

    // Function to save travel request to Firebase
    async function saveTravelRequest() {
        console.log('Inside saveTravelRequest function...');
        const travelRequest = await createTravelRequest();

        if (!travelRequest) return;

        console.log('Travel Request:', travelRequest);

        try {
            const response = await axios.patch(TravelRequest_DB, travelRequest);
            console.log('Response:', response.data);
            alert('Travel request submitted successfully!');
            clearForm();
        } catch (error) {
            console.error('Error saving travel request:', error);
            alert('Failed to submit travel request. Please try again.');
        }
    }

    const form = document.querySelector('.travel-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted! Calling saveTravelRequest...');

            // Validate travel date
            if (!isValidTravelDate(travelDate.value)) {
                alert('Travel date cannot be in the past. Please select a valid date.');
                travelDate.value = '';
                return;
            }

            saveTravelRequest();
        });
    } else {
        console.error('Form element not found!');
    }

    // #####################################  MAHESH ##############################################################

    const firebaseBaseUrl = 'https://sample-cd206-default-rtdb.firebaseio.com';
    const employeesDatabase = `${firebaseBaseUrl}/employees.json`;
    const travelRequestsDatabase = `${firebaseBaseUrl}/travelRequests.json`;
    

    let travelRequests = {
        recentRequests: [],
        previousRequests: []
    };

    let currentUser = {
        id: 'E456',
        name: ''
    };

    
    let currentFilterTable = 'recent';

    async function fetchTravelRequests() {

        try {
    
            const employeesResponse = await axios.get(employeesDatabase);
    
            const employeesData = employeesResponse.data;
    
            const travelRequestsResponse = await axios.get(travelRequestsDatabase);
    
            const travelRequestsData = travelRequestsResponse.data;
     
            if (employeesData && travelRequestsData) {
    
                if (employeesData[currentUser.id]) {
    
                    currentUser.name = employeesData[currentUser.id].name;
    
                    updateUserProfile();
    
                }
    
                processRequests(travelRequestsData, employeesData);
    
            } else {
    
                displayErrorMessage('Data structure is not as expected');
    
            }
    
        } catch (error) {
    
            console.error('Error fetching data:', error);
    
            displayErrorMessage('Failed to load travel requests. Please try again later.');
    
        }
    
    }
    
     

    function updateUserProfile() {
        const userProfileElement = document.querySelector('.user-profile');
        if (userProfileElement && currentUser.name) {
            userProfileElement.innerHTML = `
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E" alt="Profile">
                ${currentUser.name}
            `;
        }
    }

    function displayErrorMessage(message) {
        const errorRow = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #ff3333;">
                    ${message}
                </td>
            </tr>
        `;

        document.getElementById('requestTableBody').innerHTML = errorRow;
        document.getElementById('previousRequestTableBody').innerHTML = errorRow;
    }

    function processRequests(travelRequestsData, employeesData) {
        const currentDate = new Date();
        const recentRequests = [];
        const previousRequests = [];

        if (travelRequestsData) {
            Object.entries(travelRequestsData).forEach(([requestId, request]) => {
                const employeeName = employeesData[request.employeeId].name || 'Unknown';
                const travelDetails = request.travelDetails || {};
                const bookingDetails = request.bookingDetails || {};

                const formattedRequest = {
                    requestId,
                    requestDate: formatDate(bookingDetails.createdAt),
                    source: travelDetails.sourceCity || 'N/A',
                    destination: travelDetails.destinationCity || 'N/A',
                    projectCode: travelDetails.projectCode || 'N/A',
                    status: capitalizeFirstLetter(bookingDetails.status) || 'N/A',
                    travelDate: formatDate(travelDetails.travelDate) || 'N/A',
                    rawCreatedAt: bookingDetails.createdAt,
                    rawTravelDate: travelDetails.travelDate
                };

                const hoursSinceCreation = (currentDate - new Date(bookingDetails.createdAt)) / (1000 * 60 * 60);
                const isPending = bookingDetails.status.toLowerCase() === 'pending';

                if (hoursSinceCreation <= 48 || isPending) {
                    recentRequests.push(formattedRequest);
                } else {
                    previousRequests.push(formattedRequest);
                }
            });
        }
        // Sort by date, newest first
        const sortByDate = (a, b) => new Date(b.rawCreatedAt) - new Date(a.rawCreatedAt);
        recentRequests.sort(sortByDate);
        previousRequests.sort(sortByDate);

        travelRequests.recentRequests = recentRequests;
        travelRequests.previousRequests = previousRequests;
        renderTravelRequests();
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';

        let date;

        if (dateString.includes(' ')) {
            const [datePart, timePart] = dateString.split(' ');
            const [year, month, day] = datePart.split('-');
            date = new Date(year, month - 1, day);
        } else {
            const [year, month, day] = dateString.split('-');
            date = new Date(year, month - 1, day);
        }

        if (isNaN(date.getTime())) return 'Invalid Date';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    }

    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function renderTravelRequests() {
        renderTable('requestTableBody', travelRequests.recentRequests, 'No recent requests found.');
        renderTable('previousRequestTableBody', travelRequests.previousRequests, 'No previous requests found.');
    }

    
    function renderTable(tableId, requests, emptyMessage) {
        const tableBody = document.getElementById(tableId);
        tableBody.innerHTML = '';

        if (requests.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px; color: #888;">
                        ${emptyMessage}
                    </td>
                </tr>
            `;
            return;
        }

        requests.forEach(request => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${request.requestId}</td>
                <td>${request.requestDate}</td>
                <td>${request.source}</td>
                <td>${request.destination}</td>
                <td>${request.travelDate}</td>
                <td>${request.projectCode}</td>
                <td class="status ${request.status.toLowerCase()}">${request.status}</td>
            `;

            row.dataset.source = request.source;
            row.dataset.destination = request.destination;
            row.dataset.projectCode = request.projectCode;
            row.dataset.status = request.status.toLowerCase();

            tableBody.appendChild(row);
        });
    }

    function openModal(tableType) {
        const modal = document.getElementById("filterModal");
        resetFilterForm();
        currentFilterTable = tableType;
        modal.style.display = "flex";
    }

    function closeModal() {
        document.getElementById("filterModal").style.display = "none";
    }

    function resetFilterForm() {
        document.getElementById("filterStatus").value = "";
        document.getElementById("filterSource").value = "";
        document.getElementById("filterDestination").value = "";
        document.getElementById("filterProjectCode").value = "";
        document.getElementById("filterDate").value = "";
        document.getElementById("filterTravelDate").value = "";
    }

    function filterRequests() {
        const filters = {
            status: document.getElementById("filterStatus").value.toLowerCase().trim(),
            source: document.getElementById("filterSource").value.toLowerCase().trim(),
            destination: document.getElementById("filterDestination").value.toLowerCase().trim(),
            projectCode: document.getElementById("filterProjectCode").value.toLowerCase().trim(),
            requestDate: document.getElementById("filterDate").value,
            travelDate: document.getElementById("filterTravelDate").value
        };

        const tableId = currentFilterTable === 'recent' ? "requestTableBody" : "previousRequestTableBody";
        const tableBody = document.getElementById(tableId);

        if (!tableBody) return;

        const noResultsRow = tableBody.querySelector('.no-results-row');
        if (noResultsRow) noResultsRow.remove();

        let visibleCount = 0;
        const rows = tableBody.querySelectorAll("tr");

        rows.forEach(row => {
            if (row.cells.length === 1 && row.cells[0].colSpan === 7) return;

            const matchesStatus = !filters.status || row.dataset.status.toLowerCase() === filters.status;
            const matchesSource = !filters.source || row.dataset.source.toLowerCase().includes(filters.source);
            const matchesDestination = !filters.destination || row.dataset.destination.toLowerCase().includes(filters.destination);
            const matchesProjectCode = !filters.projectCode || row.dataset.projectCode.toLowerCase().includes(filters.projectCode);

            let matchesRequestDate = true;
            if (filters.requestDate) {
                const filterDate = formatDate(filters.requestDate);
                matchesRequestDate = row.cells[1].textContent === filterDate;
            }

            let matchesTravelDate = true;
            if (filters.travelDate) {
                const filterTravelDate = formatDate(filters.travelDate);
                matchesTravelDate = row.cells[4].textContent === filterTravelDate;
            }

            if (matchesStatus && matchesSource && matchesDestination && matchesProjectCode &&
                matchesRequestDate && matchesTravelDate) {
                row.style.display = "";
                visibleCount++;
            } else {
                row.style.display = "none";
            }
        });

        if (visibleCount === 0 && rows.length > 0) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.classList.add('no-results-row');
            noResultsRow.innerHTML = `
                <td colspan="7" style="text-align: center; padding: 20px; color: #888;">
                    No results found matching your filter criteria.
                </td>
            `;
            tableBody.appendChild(noResultsRow);
        }

        closeModal();
    }

    fetchTravelRequests();

    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons[0].addEventListener("click", () => openModal('recent'));
    filterButtons[1].addEventListener("click", () => openModal('previous'));

    document.getElementById("closeModal").addEventListener("click", closeModal);
    document.getElementById("filterModal").addEventListener("click", e => {
        if (e.target === document.getElementById("filterModal")) closeModal();
    });
    document.getElementById("applyFilter").addEventListener("click", filterRequests);
    document.getElementById("clearFilter").addEventListener("click", () => {
        resetFilterForm();
        closeModal();
        renderTravelRequests(); 
    });
});