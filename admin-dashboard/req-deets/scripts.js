// Firebase Realtime Database URLs
const TRAVEL_REQUESTS_URL = 'https://sample-cd206-default-rtdb.firebaseio.com/travelRequests.json';
const EMPLOYEE_DETAILS_URL = 'https://sample-cd206-default-rtdb.firebaseio.com/employees.json';
const MANAGERS_DETAILS_URL = 'https://sample-cd206-default-rtdb.firebaseio.com/managers.json';
class TravelRequestManager {
    constructor() {
        this.allRequests = [];
        this.filteredRequests = [];
        this.employees = {};
        this.managers = {};
        this.currentStatusFilter = 'all';
        this.currentTravelTypeFilter = 'all';
        this.currentDateFilter = 'all';
        this.currentDateTypeFilter = 'travel';
        this.customDate = null;
        this.datePicker = null;
        this.initializeEventListeners();
        this.initDatePicker();
    }

    initDatePicker() {
        this.datePicker = flatpickr("#date-picker", {
            dateFormat: "Y-m-d",
            allowInput: true,
            onClose: (selectedDates, dateStr) => {
                this.customDate = dateStr;
                this.filterRequests();
            }
        });
    }

    async initializeEventListeners() {
        await this.loadEmployees();

        if (document.getElementById('requests-tbody')) {
            await this.loadRequests();
            this.setupFilterAndSearch();
        }

        if (document.getElementById('request-id-number')) {
            await this.loadRequestDetails();
        }

        this.setupCommunicationSection();
    }

    async loadEmployees() {
        try {
            const response = await axios.get(EMPLOYEE_DETAILS_URL);
            this.employees = response.data || {};
        } catch (error) {
            console.error('Error loading employee data:', error);
            this.showErrorMessage('Unable to load employee data. Please try again later.');
        }
    }

    async loadRequests() {
        try {
            const response = await axios.get(TRAVEL_REQUESTS_URL);
            const requests = response.data || {};

            this.allRequests = Object.entries(requests).map(([requestId, requestData]) => {
                const employee = this.employees[requestData.employeeId] || {};
                const travelDetails = requestData.travelDetails || {};
                const bookingDetails = requestData.bookingDetails || {};

                // Parse createdAt date (handles both ISO and "YYYY-MM-DD HH:MM:SS" formats)
                let createdAt;
                try {
                    if (bookingDetails.createdAt) {
                        if (bookingDetails.createdAt.includes('T')) {
                            createdAt = new Date(bookingDetails.createdAt);
                        } else if (bookingDetails.createdAt.includes(' ')) {
                            const [datePart, timePart] = bookingDetails.createdAt.split(' ');
                            const [year, month, day] = datePart.split('-');
                            const [hours, minutes, seconds] = timePart.split(':');
                            createdAt = new Date(year, month - 1, day, hours, minutes, seconds);
                        } else {
                            createdAt = new Date(bookingDetails.createdAt);
                        }
                    } else {
                        createdAt = new Date();
                    }
                } catch (e) {
                    console.error('Error parsing createdAt:', bookingDetails.createdAt, e);
                    createdAt = new Date();
                }

                return {
                    requestId,
                    employeeName: employee.name || 'Unknown',
                    projectCode: travelDetails.projectCode || 'N/A',
                    source: `${travelDetails.sourceCity}, ${travelDetails.sourceCountry}`,
                    destination: `${travelDetails.destinationCity}, ${travelDetails.destinationCountry}`,
                    travelType: travelDetails.travelType || 'N/A',
                    status: bookingDetails.status || 'pending',
                    travelDate: travelDetails.travelDate,
                    createdAt: createdAt
                };
            });

            this.filteredRequests = [...this.allRequests];
            this.displayRequests(this.filteredRequests);

        } catch (error) {
            console.error('Error loading requests:', error);
            this.showErrorMessage('Unable to load requests. Please try again later.');
        }
    }

    setupFilterAndSearch() {
        // Search input
        document.getElementById('request-search').addEventListener('input', (e) => {
            this.filterRequests();
        });

        // Status filter
        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.currentStatusFilter = e.target.value;
            this.filterRequests();
        });

        // Travel type filter
        document.getElementById('travel-type-filter').addEventListener('change', (e) => {
            this.currentTravelTypeFilter = e.target.value;
            this.filterRequests();
        });

        // Date type filter (Travel Date vs Request Date)
        document.getElementById('date-type-filter').addEventListener('change', (e) => {
            this.currentDateTypeFilter = e.target.value;
            // Reset date filter when switching types
            this.currentDateFilter = 'all';
            document.getElementById('date-filter').value = 'all';
            document.getElementById('date-picker').style.display = 'none';
            this.customDate = null;
            this.filterRequests();
        });

        // Date filter (applies to whichever date type is selected)
        document.getElementById('date-filter').addEventListener('change', (e) => {
            this.currentDateFilter = e.target.value;
            const datePickerElement = document.getElementById('date-picker');

            if (this.currentDateFilter === 'custom') {
                datePickerElement.style.display = 'block';
                setTimeout(() => {
                    this.datePicker.open();
                }, 10);
            } else {
                datePickerElement.style.display = 'none';
                this.datePicker.clear();
                this.customDate = null;
                this.filterRequests();
            }
        });

        // Date picker input
        document.getElementById('date-picker').addEventListener('change', (e) => {
            this.customDate = e.target.value;
            this.filterRequests();
        });
    }

    filterRequests() {
        const searchTerm = document.getElementById('request-search').value.toLowerCase();

        this.filteredRequests = this.allRequests.filter(request => {
            // Search filter
            const matchesSearch =
                request.employeeName.toLowerCase().includes(searchTerm) ||
                request.projectCode.toLowerCase().includes(searchTerm) ||
                request.source.toLowerCase().includes(searchTerm) ||
                request.destination.toLowerCase().includes(searchTerm);

            // Status filter
            const matchesStatus =
                this.currentStatusFilter === 'all' ||
                request.status.toLowerCase() === this.currentStatusFilter;

            // Travel type filter
            const matchesTravelType =
                this.currentTravelTypeFilter === 'all' ||
                request.travelType.toLowerCase() === this.currentTravelTypeFilter;

            // Date filter (switches between travel date and request date)
            const matchesDate = this.currentDateTypeFilter === 'travel'
                ? this.filterByTravelDate(request)
                : this.filterByRequestDate(request);

            return matchesSearch && matchesStatus && matchesTravelType && matchesDate;
        });

        this.displayRequests(this.filteredRequests);
    }

    filterByTravelDate(request) {
        if (!request.travelDate) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const travelDate = new Date(request.travelDate);
        travelDate.setHours(0, 0, 0, 0);

        switch (this.currentDateFilter) {
            case 'today':
                return travelDate.getTime() === today.getTime();
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return travelDate >= weekStart && travelDate <= today;
            case 'month':
                return travelDate.getMonth() === today.getMonth() &&
                    travelDate.getFullYear() === today.getFullYear();
            case 'custom':
                if (!this.customDate) return true;
                const selectedDate = new Date(this.customDate);
                selectedDate.setHours(0, 0, 0, 0);
                return travelDate.getTime() === selectedDate.getTime();
            default: // 'all'
                return true;
        }
    }

    filterByRequestDate(request) {
        if (!request.createdAt) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const requestDate = new Date(request.createdAt);
        requestDate.setHours(0, 0, 0, 0);

        switch (this.currentDateFilter) {
            case 'today':
                return requestDate.getTime() === today.getTime();
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return requestDate >= weekStart && requestDate <= today;
            case 'month':
                return requestDate.getMonth() === today.getMonth() &&
                    requestDate.getFullYear() === today.getFullYear();
            case 'custom':
                if (!this.customDate) return true;
                const selectedDate = new Date(this.customDate);
                selectedDate.setHours(0, 0, 0, 0);
                return requestDate.getTime() === selectedDate.getTime();
            default: // 'all'
                return true;
        }
    }

    displayRequests(requests) {
        const tbody = document.getElementById('requests-tbody');
        tbody.innerHTML = '';

        if (requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No matching requests found</td></tr>';
            document.getElementById('total-requests').textContent = 'Total 0 requests';
            return;
        }

        document.getElementById('total-requests').textContent = `Total ${requests.length} requests`;

        requests.forEach(request => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${request.requestId}</td>
                <td>${request.employeeName}</td>
                <td>${request.travelDate || 'N/A'}</td>
                <td>${request.source}</td>
                <td>${request.destination}</td>
                <td>
                    <span class="travel-type-badge travel-type-${request.travelType.toLowerCase()}">
                        ${request.travelType}
                    </span>
                </td>
                <td>${request.projectCode}</td>
                <td class="status-${request.status.toLowerCase()}">${request.status}</td>
                <td>
                    <button class="btn btn-view-details" data-request-id="${request.requestId}">
                        View Details
                    </button>
                </td>
            `;

            row.querySelector('.btn-view-details').addEventListener('click', () => {
                window.location.href = `xpress_demo/request-details.html?requestId=${request.requestId}`;
            });

            tbody.appendChild(row);
        });
    }

    updateRequestProgress(status) {
        const progressSteps = document.querySelectorAll('.progress-step');
        const statusProgression = ['pending', 'approved', 'ticketed', 'closed'];

        progressSteps.forEach(step => {
            step.classList.remove('completed', 'active');
        });

        const currentStatusIndex = statusProgression.findIndex(
            progressStatus => progressStatus === status
        );

        if (currentStatusIndex !== -1) {
            for (let i = 0; i < currentStatusIndex; i++) {
                progressSteps[i].classList.add('completed');
            }
            progressSteps[currentStatusIndex].classList.add('active');
        }
    }

    async loadRequestDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const requestId = urlParams.get('requestId');

        if (!requestId) {
            this.showErrorMessage('No request ID provided');
            return;
        }

        try {
            const response = await axios.get(TRAVEL_REQUESTS_URL);
            const requests = response.data || {};

            if (!requests) {
                this.showErrorMessage('No requests found');
                return;
            }

            const requestData = requests[requestId];
            if (!requestData) {
                this.showErrorMessage('Request not found');
                return;
            }

            this.populateRequestDetails(requestId, requestData);
        } catch (error) {
            console.error('Error loading request details:', error);
            this.showErrorMessage('Unable to load request details. Please try again later.');
        }
    }

    populateRequestDetails(requestId, requestData) {
        const travelDetails = requestData.travelDetails || {};
        const bookingDetails = requestData.bookingDetails || {};

        const detailsMap = {
            'request-id-number': requestId,
            'project-code': travelDetails.projectCode,
            'travel-type': travelDetails.travelType,
            'source': `${travelDetails.sourceCity}, ${travelDetails.sourceCountry}`,
            'destination': `${travelDetails.destinationCity}, ${travelDetails.destinationCountry}`,
            'travel-date': travelDetails.travelDate,
            'status': bookingDetails.status
        };

        Object.entries(detailsMap).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value || 'N/A';
                if (elementId === 'status') {
                    element.className = `status-${(value || '').toLowerCase()}`;
                }
            }
        });

        this.updateRequestProgress(bookingDetails.status);
    }

    setupCommunicationSection() {
        const sendButton = document.querySelector('.btn-send');
        const messageTextarea = document.querySelector('.communication-input textarea');

        if (sendButton && messageTextarea) {
            sendButton.addEventListener('click', () => {
                const message = messageTextarea.value.trim();
                if (message) {
                    console.log('Message sent:', message);
                    messageTextarea.value = '';
                }
            });
        }
    }

    showErrorMessage(message) {
        console.error(message);
        const errorContainer = document.createElement('div');
        errorContainer.classList.add('error-message');
        errorContainer.textContent = message;
        document.body.insertAdjacentElement('afterbegin', errorContainer);
        setTimeout(() => errorContainer.remove(), 5000);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (typeof axios === 'undefined') {
        console.error('Axios library is not loaded');
        return;
    }
    if (typeof flatpickr === 'undefined') {
        console.error('Flatpickr library is not loaded');
        return;
    }
    new TravelRequestManager();
});