const TRAVEL_REQUESTS_URL = 'https://sample-cd206-default-rtdb.firebaseio.com/travelRequests.json';
const EMPLOYEE_DETAILS_URL = 'https://sample-cd206-default-rtdb.firebaseio.com/employees.json';
const MANAGERS_DETAILS_URL = 'https://sample-cd206-default-rtdb.firebaseio.com/managers.json';
class TravelRequestManager {
    constructor() {
        this.initialize();
    }

    async initialize() {
        await this.delay(100); // Ensures DOM is ready
        this.initializeEventListeners();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initializeEventListeners() {
        this.loadManagerInfo();

        if (document.getElementById('requests-tbody')) {
            this.loadRequests();
            this.setupFilterAndSearch();
        }

        if (document.getElementById('request-id-number')) {
            this.loadRequestDetails();
        }

        this.setupCommunicationSection();
    }

    async loadRequests() {
        try {
            const requests = (await axios.get(TRAVEL_REQUESTS_URL)).data;
            const requestsTableBody = document.getElementById('requests-tbody');
            requestsTableBody.innerHTML = '';

            if (!requests || Object.keys(requests).length === 0) {
                requestsTableBody.innerHTML = `<td colspan="7" class="text-center">No travel requests found</td>`;
                this.updateTotalRequestsCount(0);
                return;
            }

            this.updateTotalRequestsCount(Object.keys(requests).length);
            Object.entries(requests).forEach(([requestId, requestData]) => {
                requestsTableBody.appendChild(this.createRequestRow(requestId, requestData));
            });
        } catch (error) {
            this.handleError('Error loading requests:', error, 'Unable to load requests. Please try again later.');
        }
    }

    async loadManagerInfo() {
        try {
            const response = await axios.get(MANAGERS_DETAILS_URL);
            this.managers = response.data || {};
            const du1Manager = Object.values(this.managers).find(manager => manager.deliveryUnit === 'DU1');
            if (du1Manager) {
                const profileName = document.querySelector('.profile-name');
                const profileEmail = document.querySelector('.profile-email');
                if (profileName) profileName.textContent = du1Manager.name;
                if (profileEmail) profileEmail.textContent = du1Manager.email;
            }
        } catch (error) {
            console.error('Error loading manager info:', error);
        }
    }

    createRequestRow(requestId, requestData) {
        const row = document.createElement('tr');
        const travelTypeBadge = requestData.travelDetails.travelType === 'international' ?
            '<span class="badge badge-international">International</span>' :
            '<span class="badge badge-domestic">Domestic</span>';

        row.innerHTML = `
            <td>${requestId}</td>
            <td>${requestData.travelDetails.travelDate || 'N/A'}</td>
            <td>${requestData.travelDetails.sourceCity || 'N/A'}</td>
            <td>${requestData.travelDetails.destinationCity || 'N/A'}</td>
            <td>${requestData.travelDetails.projectCode || 'N/A'}</td>
            <td class="status-${(requestData.bookingDetails.status || '').toLowerCase()}">${requestData.bookingDetails.status || 'N/A'}</td>
            <td><button class="btn btn-view-details" data-request-id="${requestId}">View Details 👁️</button></td>
        `;

        row.querySelector('.btn-view-details').addEventListener('click', () => {
            window.location.href = `index.html?requestId=${requestId}`;
        });

        return row;
    }

    setupApproveRejectButtons(requestId, requestData) {
        const approveButton = document.querySelector('.btn-approve');
        const rejectButton = document.querySelector('.btn-reject');

        if (!approveButton || !rejectButton) return;

        const isPending = requestData.bookingDetails.status.toLowerCase() === 'pending';
        approveButton.disabled = rejectButton.disabled = !isPending;

        const handleStatusChange = async (newStatus, successMessage) => {
            approveButton.disabled = rejectButton.disabled = true;
            try {
                await this.updateRequestStatus(requestId, newStatus);
                this.updateUIStatus(newStatus);
                this.updateRequestProgress(newStatus);
                this.showSuccessMessage(successMessage);
            } catch (error) {
                this.handleError(`Error ${newStatus === 'approved' ? 'approving' : 'rejecting'} request:`, error, `Failed to ${newStatus === 'approved' ? 'approve' : 'reject'} request. Please try again.`);
                if (isPending) approveButton.disabled = rejectButton.disabled = false;
            }
        };

        approveButton.addEventListener('click', () => handleStatusChange('approved', 'Request approved successfully!'));
        rejectButton.addEventListener('click', () => handleStatusChange('rejected', 'Request rejected successfully!'));
    }

    async updateRequestStatus(requestId, newStatus) {
        const REQUEST_URL_UPDATE = `https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}/bookingDetails/status.json`;
        const CLOSE_AT_URL = `https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}/bookingDetails/closeAt.json`;
        await axios.put(REQUEST_URL_UPDATE, JSON.stringify(newStatus));
        
        if (newStatus === 'rejected' || newStatus === 'closed') {
            const now = new Date();
            const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            await axios.put(CLOSE_AT_URL, JSON.stringify(formattedDate));
        }
    }

    showSuccessMessage(message) {
        const successContainer = this.createMessageContainer('success-message', message);
        document.body.appendChild(successContainer);
        setTimeout(() => successContainer.classList.add('fade-out'), 3000);
        setTimeout(() => successContainer.remove(), 3500);
    }

    updateRequestProgress(status) {
        const progressSteps = document.querySelectorAll('.progress-step');
        const stepTexts = document.querySelectorAll('.step-details h6');

        progressSteps.forEach(step => step.classList.remove('completed', 'active', 'pending', 'reject'));
        progressSteps[0].classList.add('completed');

        if (status === 'rejected') {
            progressSteps[1].classList.add('reject');
            stepTexts[1].textContent = 'Manager Rejected';
            for (let i = 2; i < progressSteps.length; i++) progressSteps[i].classList.add('pending');
            return;
        }

        const statusProgression = ['pending', 'approved', 'ticketed', 'closed'];
        const currentStatusIndex = statusProgression.indexOf(status);
        if (currentStatusIndex === -1) return;

        stepTexts[1].textContent = currentStatusIndex >= 1 ? 'Manager Approved' : 'Waiting for Manager Approval';
        stepTexts[2].textContent = currentStatusIndex >= 2 ? 'Tickets Confirmed' : 'Waiting for Ticket Confirmation';
        stepTexts[3].textContent = currentStatusIndex >= 3 ? 'Request Closed' : 'Closing Request';

        for (let i = 0; i <= currentStatusIndex; i++) progressSteps[i].classList.add('completed');
        if (currentStatusIndex + 1 < progressSteps.length) progressSteps[currentStatusIndex + 1].classList.add('active');
    }

    async fetchEmployeeDetails(employeeId) {
        try {
            const employees = (await axios.get(EMPLOYEE_DETAILS_URL)).data;
            if (!employees) return null;
            const employeeKey = Object.keys(employees).find(key => key === employeeId);
            return employeeKey ? { empId: employeeKey, ...employees[employeeKey] } : null;
        } catch (error) {
            this.handleError('Error fetching employee details:', error);
            return null;
        }
    }

    async loadRequestDetails() {
        try {
            const requestId = new URLSearchParams(window.location.search).get('requestId');
            if (!requestId) return this.showErrorMessage('No request ID provided');

            const requests = (await axios.get(TRAVEL_REQUESTS_URL)).data;
            if (!requests) return this.showErrorMessage('No requests found');

            const matchedRequest = Object.entries(requests).find(([id]) => /^TR-\d+$/.test(id) && id === requestId);
            if (!matchedRequest) return this.showErrorMessage('Request not found');

            const [matchedRequestId, requestData] = matchedRequest;
            this.populateRequestDetails(matchedRequestId, requestData);
            this.setupApproveRejectButtons(matchedRequestId, requestData);
            this.updateSendButtonState(requestData.bookingDetails.status);
        } catch (error) {
            this.handleError('Error loading request details:', error, 'Unable to load request details. Please try again later.');
        }
    }

    updateSendButtonState(status) {
        const sendButton = document.querySelector('.btn-send');
        if (sendButton) sendButton.disabled = status.toLowerCase() !== 'approved';
    }

    async loadTicketOptions(requestId, requestData) {
        const container = document.getElementById('ticket-options-container');
        if (!container) return console.warn('Ticket options container not found');
        container.innerHTML = '';
        if (!requestData.ticketDetails?.optionTickets || Object.keys(requestData.ticketDetails.optionTickets).length === 0) {
            return container.innerHTML = '<p>No ticket options available yet.</p>';
        }

        let index = 0;
        for (const [ticketId, option] of Object.entries(requestData.ticketDetails.optionTickets)) {
            container.appendChild(this.createTicketOptionCard(ticketId, option, index++, requestData.ticketDetails?.selectedTicket));
        }
    }

    createTicketOptionCard(ticketId, option, index, selectedTicket) {
        const card = document.createElement('div');
        card.className = 'ticket-option';
        let html = `<h3>Option ${index + 1}</h3><div class="ticket-option-details"><div class="ticket-option-detail"><label>Ticket ID:</label><span>${ticketId}</span></div>`;
        for (const [key, value] of Object.entries(option)) {
            if (value) html += `<div class="ticket-option-detail"><label>${this.formatLabel(key)}:</label><span>${key === 'price' ? '₹' + value.toLocaleString() : value}</span></div>`;
        }
        card.innerHTML = html + '</div>';

        if (selectedTicket && selectedTicket[ticketId]) {
            card.classList.add('selected');
            card.innerHTML += '<div class="selected-indicator">✓ Selected</div>';
        }
        return card;
    }

    formatLabel(camelCase) {
        const withSpaces = camelCase.replace(/([A-Z])/g, ' $1');
        return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
    }

    setupCommunicationSection() {
        const sendButton = document.querySelector('.btn-send');
        const statusElement = document.getElementById('status');

        if (statusElement) {
            this.updateCommunicationVisibility(statusElement.textContent);
        }

        if (sendButton) {
            sendButton.addEventListener('click', async () => {
                const ticketData = this.collectTicketData();
                if (ticketData) {
                    await this.addNewTicket(ticketData.ticketId, ticketData.details);
                    this.clearTicketForm();
                }
            });
        }
    }

    collectTicketData() {
        const airlineInput = document.querySelector('.ticket-field input[name="airline"]');
        const departureTimeInput = document.querySelector('.ticket-field input[name="departureTime"]');
        const flightNumberInput = document.querySelector('.ticket-field input[name="flightNumber"]');
        const priceInput = document.querySelector('.ticket-field input[name="price"]');

        // Debug: Log the input elements
        console.log('Airline Input:', airlineInput);
        console.log('Departure Time Input:', departureTimeInput);
        console.log('Flight Number Input:', flightNumberInput);
        console.log('Price Input:', priceInput);

        if (!airlineInput || !departureTimeInput || !flightNumberInput || !priceInput) {
            this.showErrorMessage('Form fields are missing. Contact support.');
            return null;
        }

        const airline = airlineInput.value.trim();
        const departureTime = departureTimeInput.value.trim();
        const flightNumber = flightNumberInput.value.trim();
        const priceRaw = priceInput.value.trim();
        const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '').split('.').slice(0, 2).join('.'));

        // Debug: Log the values
        console.log('Airline:', airline);
        console.log('Departure Time:', departureTime);
        console.log('Flight Number:', flightNumber);
        console.log('Price Raw:', priceRaw, 'Parsed Price:', price);

        if (!airline) {
            this.showErrorMessage('Airline is required');
            return null;
        }
        if (!departureTime) {
            this.showErrorMessage('Departure time is required');
            return null;
        }
        if (!flightNumber) {
            this.showErrorMessage('Flight number is required');
            return null;
        }
        if (!priceRaw || isNaN(price) || price <= 0) {
            this.showErrorMessage('Valid price is required');
            return null;
        }

        const ticketId = `TIC-${Math.floor(Math.random() * 1000000000)}`;
        return { ticketId, details: { airline, departureTime, flightNumber, price } };
    }

    async addNewTicket(ticketId, ticketDetails) {
        try {
            const requestId = new URLSearchParams(window.location.search).get('requestId');
            if (!requestId) {
                this.showErrorMessage('No request ID provided');
                return;
            }

            const requestUrl = `https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}.json`;
            const response = await axios.get(requestUrl);
            const requestData = response.data;

            if (!requestData) {
                this.showErrorMessage('Travel request not found');
                return;
            }

            if (!requestData.ticketDetails) {
                requestData.ticketDetails = { optionTickets: {} };
            } else if (!requestData.ticketDetails.optionTickets) {
                requestData.ticketDetails.optionTickets = {};
            }

            requestData.ticketDetails.optionTickets[ticketId] = ticketDetails;
            await axios.put(requestUrl, requestData);

            this.showSuccessMessage(`Ticket ${ticketId} added successfully!`);
            this.loadTicketOptions(requestId, requestData);
        } catch (error) {
            this.handleError('Error adding new ticket:', error, 'Failed to add ticket. Please try again.');
        }
    }

    clearTicketForm() {
        const inputs = document.querySelectorAll('.ticket-field input');
        inputs.forEach(input => input.value = '');
    }

    async populateRequestDetails(requestId, requestData) {
        const details = {
            'request-id-number': requestId,
            'project-code': requestData.travelDetails.projectCode,
            'travel-type': requestData.travelDetails.travelType,
            'source': requestData.travelDetails.sourceCity,
            'destination': requestData.travelDetails.destinationCity,
            'travel-date': requestData.travelDetails.travelDate,
            'status': requestData.bookingDetails.status
        };

        Object.entries(details).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value || 'N/A';
        });

        this.updateUIStatus(requestData.bookingDetails.status);
        await this.displayEmployeeDetails(requestData.employeeId);
        this.updateRequestProgress(requestData.bookingDetails.status);
        this.loadTicketOptions(requestId, requestData);
    }

    updateUIStatus(status) {
        const element = document.getElementById('status');
        if (element) {
            element.className = `status-${status.toLowerCase()}`;
            element.textContent = status;
        }
        this.updateCommunicationVisibility(status);
    }

    updateCommunicationVisibility(status) {
        const communicationElements = document.querySelectorAll('.request-communication');
        const isApproved = status.toLowerCase() === 'approved';
        const isTicketed = status.toLowerCase() === 'ticketed';

        communicationElements.forEach(element => {
            element.style.display = (isApproved || isTicketed) ? 'block' : 'none';
        });

        const ticketDetailsForm = document.querySelector('.ticket-details-form');
        const sendButton = document.querySelector('.btn-send');
        const communicationInput = document.querySelector('.communication-input');

        if (ticketDetailsForm) {
            ticketDetailsForm.style.display = isApproved ? 'block' : 'none';
        }
        if (sendButton) {
            sendButton.style.display = isApproved ? 'inline-block' : 'none';
        }

        let closeButton = document.querySelector('.btn-close-request');
        if (!closeButton && communicationInput && isTicketed) {
            closeButton = document.createElement('button');
            closeButton.className = 'btn-close-request';
            closeButton.textContent = 'Close Request';
            closeButton.style.backgroundColor = '#17A948';
            closeButton.style.color = 'white';
            closeButton.style.border = 'none';
            closeButton.style.padding = '8px 15px';
            closeButton.style.borderRadius = '4px';
            closeButton.style.cursor = 'pointer';
            closeButton.style.marginTop = '10px';

            closeButton.addEventListener('click', async () => {
                const requestId = new URLSearchParams(window.location.search).get('requestId');
                if (requestId) {
                    try {
                        await this.updateRequestStatus(requestId, 'closed');
                        this.updateUIStatus('closed');
                        this.updateRequestProgress('closed');
                        this.showSuccessMessage('Request closed successfully!');
                    } catch (error) {
                        this.handleError('Error closing request:', error, 'Failed to close request. Please try again.');
                    }
                }
            });

            communicationInput.appendChild(closeButton);
        }

        if (closeButton) {
            closeButton.style.display = isTicketed ? 'block' : 'none';
        }

        const sectionTitle = document.querySelector('.communication-section h2');
        if (sectionTitle) {
            sectionTitle.textContent = isApproved ? 'Add Tickets' : (isTicketed ? 'Complete Request' : 'Tickets');
        }
    }

    async displayEmployeeDetails(employeeId) {
        const employeeInfo = await this.fetchEmployeeDetails(employeeId);
        const container = document.getElementById('employee-info');
        if (!container) return;

        if (employeeInfo) {
            container.innerHTML = `<p><b>${employeeInfo.name}</b></p><p>ID: ${employeeInfo.empId}</p><p>Department: ${employeeInfo.deliveryUnit || 'N/A'}</p>`;
        } else {
            container.innerHTML = `<p>Employee details not found for ID: ${employeeId || 'N/A'}</p>`;
        }
    }

    setupFilterAndSearch() {} // Placeholder

    handleError(message, error, displayMessage) {
        console.error(message, error);
        if (displayMessage) this.showErrorMessage(displayMessage);
    }

    showErrorMessage(message) {
        const existingError = document.querySelector('.error-message');
        if (existingError) existingError.remove();

        const errorContainer = this.createMessageContainer('error-message', message);
        const communicationSection = document.querySelector('.request-communication');
        if (communicationSection) {
            communicationSection.insertBefore(errorContainer, communicationSection.firstChild);
        } else {
            document.body.insertAdjacentElement('afterbegin', errorContainer);
        }
    }

    createMessageContainer(className, text) {
        const container = document.createElement('div');
        container.className = className;
        container.textContent = text;
        return container;
    }

    updateTotalRequestsCount(count) {
        const element = document.getElementById('total-requests');
        if (element) element.textContent = `Total ${count} requests`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof axios === 'undefined') return console.error('Axios library is not loaded');
    new TravelRequestManager();
});