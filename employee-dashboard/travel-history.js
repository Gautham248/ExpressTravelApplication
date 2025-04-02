// Database configuration
const firebaseBaseUrl = 'https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app';
const travelRequestsDatabase = `${firebaseBaseUrl}/travelRequests.json`;

// Current user (in a real app, this would come from authentication)
const currentUser = {
    id: 'E456',
    name: 'John Doe'
};

// DOM elements
const travelHistoryTable = document.getElementById('travelHistoryTable');
const filterBtn = document.getElementById('filterBtn');
const filterModal = document.getElementById('filterModal');
const closeModal = document.getElementById('closeModal');
const applyFilter = document.getElementById('applyFilter');
const clearFilter = document.getElementById('clearFilter');
const userProfileName = document.querySelector('.user-profile span');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set user profile name
    userProfileName.textContent = currentUser.name;

    // Load travel history
    fetchTravelHistory();

    // Set up event listeners
    filterBtn.addEventListener('click', () => filterModal.style.display = 'flex');
    closeModal.addEventListener('click', () => filterModal.style.display = 'none');
    applyFilter.addEventListener('click', applyFilters);
    clearFilter.addEventListener('click', clearFilters);

    // Close modal when clicking outside
    filterModal.addEventListener('click', (e) => {
        if (e.target === filterModal) {
            filterModal.style.display = 'none';
        }
    });
});

// Fetch travel history from Firebase
async function fetchTravelHistory(filters = {}) { // Accept filters as an argument
    try {
        const response = await axios.get(travelRequestsDatabase);
        const travelRequests = response.data;

        if (travelRequests) {
            let filteredRequests = filterClosedRequests(travelRequests); //filter closed requests first.
            filteredRequests = applyRequestFilters(filteredRequests, filters) // then apply filters.
            renderTravelHistory(filteredRequests);
        } else {
            showNoDataMessage();
        }
    } catch (error) {
        console.error('Error fetching travel history:', error);
        showErrorMessage('Failed to load travel history. Please try again later.');
    }
}

// Filter requests to only show closed ones for the current user
function filterClosedRequests(requests) {
    return Object.entries(requests)
        .filter(([_, request]) =>
            request.employeeId === currentUser.id &&
            request.bookingDetails.status.toLowerCase() === 'closed'
        )
        .map(([requestId, request]) => ({
            requestId,
            ...request
        }));
}

// Render travel history in the table
function renderTravelHistory(requests, filters = {}) {
    if (requests.length === 0) {
        showNoDataMessage();
        return;
    }

    // Clear existing rows
    travelHistoryTable.innerHTML = '';

    // Sort by request date (newest first)
    requests.sort((a, b) =>
        new Date(b.bookingDetails.createdAt) - new Date(a.bookingDetails.createdAt)
    );

    // Add rows to the table
    requests.forEach(request => {
        const row = document.createElement('tr');

        // Format dates
        const requestDate = formatDate(request.bookingDetails.createdAt);
        const travelDate = formatDate(request.travelDetails.travelDate);

        row.innerHTML = `
            <td>${request.requestId}</td>
            <td>${requestDate}</td>
            <td>${request.travelDetails.sourceCity}, ${request.travelDetails.sourceCountry}</td>
            <td>${request.travelDetails.destinationCity}, ${request.travelDetails.destinationCountry}</td>
            <td>${travelDate}</td>
            <td>${request.travelDetails.projectCode}</td>
            <td><span class="status closed">Closed</span></td>
        `;

        // Add data attributes for filtering
        row.dataset.source = request.travelDetails.sourceCity.toLowerCase();
        row.dataset.destination = request.travelDetails.destinationCity.toLowerCase();
        row.dataset.projectCode = request.travelDetails.projectCode.toLowerCase();
        row.dataset.requestDate = requestDate;
        row.dataset.travelDate = travelDate;

        travelHistoryTable.appendChild(row);
    });
}

// Apply filters to the requests
function applyRequestFilters(requests, filters) {
    return requests.filter(request => {
        const sourceMatch = !filters.source ||
            request.travelDetails.sourceCity.toLowerCase().includes(filters.source.toLowerCase());

        const destinationMatch = !filters.destination ||
            request.travelDetails.destinationCity.toLowerCase().includes(filters.destination.toLowerCase());

        const projectCodeMatch = !filters.projectCode ||
            request.travelDetails.projectCode.toLowerCase().includes(filters.projectCode.toLowerCase());

        let requestDateMatch = true;
        if (filters.requestDate) {
            const filterDate = filters.requestDate; // Use filter date directly
            const requestDate = new Date(request.bookingDetails.createdAt).toISOString().split('T')[0];
            requestDateMatch = filterDate === requestDate;
        }

        let travelDateMatch = true;
        if (filters.travelDate) {
            const filterDate = filters.travelDate; //use filter date directly
            const travelDate = new Date(request.travelDetails.travelDate).toISOString().split('T')[0];
            travelDateMatch = filterDate === travelDate;
        }

        return sourceMatch && destinationMatch && projectCodeMatch &&
            requestDateMatch && travelDateMatch;
    });
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        let date;

        // Handle both "YYYY-MM-DD" and "YYYY-MM-DD HH:MM:SS" formats
        if (dateString.includes(' ')) {
            const [datePart] = dateString.split(' ');
            date = new Date(datePart);
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) return 'Invalid Date';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'N/A';
    }
}

// Show no data message
function showNoDataMessage() {
    travelHistoryTable.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #777;">
                No travel history found. You haven't completed any trips yet.
            </td>
        </tr>
    `;
}

// Show no filter results message
function showNoFilterResultsMessage() {
    travelHistoryTable.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #777;">
                No trips match your filter criteria.
            </td>
        </tr>
    `;
}

// Show error message
function showErrorMessage(message) {
    travelHistoryTable.innerHTML = `
        <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #ff3333;">
                ${message}
            </td>
        </tr>
    `;
}

// Apply filters from modal
function applyFilters() {
    const filters = {
        source: document.getElementById('filterSource').value,
        destination: document.getElementById('filterDestination').value,
        projectCode: document.getElementById('filterProjectCode').value,
        requestDate: document.getElementById('filterRequestDate').value,
        travelDate: document.getElementById('filterTravelDate').value
    };

    // Close modal
    filterModal.style.display = 'none';

    // Reload data with filters
    fetchTravelHistory(filters); // Pass the filters to fetchTravelHistory
}

// Clear all filters
function clearFilters() {
    document.getElementById('filterSource').value = '';
    document.getElementById('filterDestination').value = '';
    document.getElementById('filterProjectCode').value = '';
    document.getElementById('filterRequestDate').value = '';
    document.getElementById('filterTravelDate').value = '';

    // Close modal and reload data without filters
    filterModal.style.display = 'none';
    fetchTravelHistory(); //fetch all data without filters
}