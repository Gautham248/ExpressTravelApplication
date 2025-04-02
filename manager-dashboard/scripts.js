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
        this.initDatePicker();
        this.initialize();
        // this.initializeEventListeners();
    }

    async initialize() {
        await this.delay(100);
        this.initializeEventListeners();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
        await this.loadManagerInfo();
        await this.loadEmployees();
        this.loadManagerInfoRD();

        const requestsTbody = document.getElementById('requests-tbody');
        const requestIdNumber = document.getElementById('request-id-number');

        if (requestsTbody) {
            await this.loadRequests();
            this.setupFilterAndSearch();
        }

        if (requestIdNumber) {
            await this.loadRequestDetails();
            this.loadRequestDetailsRD();
        }

        this.setupCommunicationSection();
    }

    async loadEmployees() {
        try {
            const response = await axios.get(EMPLOYEE_DETAILS_URL);
            this.employees = response.data || {};
        } catch (error) {
            this.handleError('Error loading employee data:', error, 'Unable to load employee data. Please try again later.');
        }
    }

    async loadManagerInfoRD() {
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
            this.handleError('Error loading manager info:', error);
        }
    }

    async loadRequests() {
        try {
            const response = await axios.get(TRAVEL_REQUESTS_URL);
            const requests = response.data || {};
            this.allRequests = Object.entries(requests).map(([requestId, requestData]) => this.processRequest(requestId, requestData));
            this.filteredRequests = [...this.allRequests];
            this.displayRequests(this.filteredRequests);
        } catch (error) {
            this.handleError('Error loading requests:', error, 'Unable to load requests. Please try again later.');
        }
    }

    processRequest(requestId, requestData) {
        const employee = this.employees[requestData.employeeId] || {};
        const travelDetails = requestData.travelDetails || {};
        const bookingDetails = requestData.bookingDetails || {};
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
    }

    setupFilterAndSearch() {
        const setupEventListener = (elementId, eventType, callback) => {
            const element = document.getElementById(elementId);
            if (element) element.addEventListener(eventType, callback);
        };

        setupEventListener('request-search', 'input', () => this.filterRequests());
        setupEventListener('status-filter', 'change', (e) => { this.currentStatusFilter = e.target.value; this.filterRequests(); });
        setupEventListener('travel-type-filter', 'change', (e) => { this.currentTravelTypeFilter = e.target.value; this.filterRequests(); });
        setupEventListener('date-type-filter', 'change', (e) => {
            this.currentDateTypeFilter = e.target.value;
            this.currentDateFilter = 'all';
            document.getElementById('date-filter').value = 'all';
            document.getElementById('date-picker').style.display = 'none';
            this.customDate = null;
            this.filterRequests();
        });
        setupEventListener('date-filter', 'change', (e) => {
            this.currentDateFilter = e.target.value;
            const datePickerElement = document.getElementById('date-picker');
            if (this.currentDateFilter === 'custom') {
                datePickerElement.style.display = 'block';
                setTimeout(() => this.datePicker.open(), 10);
            } else {
                datePickerElement.style.display = 'none';
                this.datePicker.clear();
                this.customDate = null;
                this.filterRequests();
            }
        });
        setupEventListener('date-picker', 'change', (e) => { this.customDate = e.target.value; this.filterRequests(); });
    }

    filterRequests() {
        const searchTerm = document.getElementById('request-search').value.toLowerCase();
        this.filteredRequests = this.allRequests.filter(request => {
            const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm) ||
                request.projectCode.toLowerCase().includes(searchTerm) ||
                request.source.toLowerCase().includes(searchTerm) ||
                request.destination.toLowerCase().includes(searchTerm);
            const matchesStatus = this.currentStatusFilter === 'all' || request.status.toLowerCase() === this.currentStatusFilter;
            const matchesTravelType = this.currentTravelTypeFilter === 'all' || request.travelType.toLowerCase() === this.currentTravelTypeFilter;
            const matchesDate = this.currentDateTypeFilter === 'travel' ? this.filterByTravelDate(request) : this.filterByRequestDate(request);
            return matchesSearch && matchesStatus && matchesTravelType && matchesDate;
        });
        this.displayRequests(this.filteredRequests);
    }

    filterByTravelDate(request) {
        return this.filterByDate(request.travelDate, this.currentDateFilter);
    }

    filterByRequestDate(request) {
        return this.filterByDate(request.createdAt, this.currentDateFilter);
    }

    filterByDate(date, filter) {
        if (!date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requestDate = new Date(date);
        requestDate.setHours(0, 0, 0, 0);
        switch (filter) {
            case 'today':
                return requestDate.getTime() === today.getTime();
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return requestDate >= weekStart && requestDate <= today;
            case 'month':
                return requestDate.getMonth() === today.getMonth() && requestDate.getFullYear() === today.getFullYear();
            case 'custom':
                if (!this.customDate) return true;
                const selectedDate = new Date(this.customDate);
                selectedDate.setHours(0, 0, 0, 0);
                return requestDate.getTime() === selectedDate.getTime();
            default:
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
                <td><span class="travel-type-badge travel-type-${request.travelType.toLowerCase()}">${request.travelType}</span></td>
                <td>${request.projectCode}</td>
                <td class="status-${request.status.toLowerCase()}">${request.status}</td>
                <td><button class="btn btn-view-details" data-request-id="${request.requestId}">View Details</button></td>
            `;
            row.querySelector('.btn-view-details').addEventListener('click', () => {
                window.location.href = `request-details.html?requestId=${request.requestId}`;
            });
            tbody.appendChild(row);
        });
    }

    updateRequestProgress(status) {
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach(step => step.classList.remove('completed', 'active'));
        const currentStatusIndex = ['pending', 'approved', 'ticketed', 'closed'].findIndex(progressStatus => progressStatus === status);
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
            const requestData = requests[requestId];
            if (!requestData) {
                this.showErrorMessage('Request not found');
                return;
            }
            this.populateRequestDetails(requestId, requestData);
        } catch (error) {
            this.handleError('Error loading request details:', error, 'Unable to load request details. Please try again later.');
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

    handleError(message, error, displayMessage) {
        console.error(message, error);
        if (displayMessage) this.showErrorMessage(displayMessage);
    }

    showErrorMessage(message) {
        console.error(message);
        const errorContainer = document.createElement('div');
        errorContainer.classList.add('error-message');
        errorContainer.textContent = message;
        document.body.insertAdjacentElement('afterbegin', errorContainer);
        setTimeout(() => errorContainer.remove(), 5000);
    }




    // ************** RIONA **************
    async loadManagerInfo() {
        try {
          const response = await axios.get(MANAGERS_DETAILS_URL);
          this.managers = response.data || {};
          
          const du1Manager = Object.values(this.managers).find(manager => 
            manager.deliveryUnit === 'DU1'
          );
          
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
                this.updateRequestProgressRD(newStatus);
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
        const REQUEST_URL_UPDATE = `https://sample-cd206-default-rtdb.firebaseio.com/travelRequests/${requestId}/bookingDetails/status.json`;
        const CLOSE_AT_URL = `https://sample-cd206-default-rtdb.firebaseio.com/travelRequests/${requestId}/bookingDetails/closeAt.json`;
        await axios.put(REQUEST_URL_UPDATE, JSON.stringify(newStatus));
        if (newStatus === 'rejected') {
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

    updateRequestProgressRD(status) {
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

    async loadRequestDetailsRD() {
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
            container.appendChild(this.createTicketOptionCard(ticketId, option, index++, requestData.ticketDetails.selectedTicket));
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
        const textarea = document.querySelector('.communication-input textarea');
        const container = document.getElementById('ticket-options-container');

        this.updateSendButtonState(document.getElementById('status').textContent);

        if (container) {
          container.addEventListener('click', e => {
              if (e.target.closest('.ticket-option-detail span')) {
                  const ticketId = e.target.textContent.trim();
                  if (textarea) {
                      textarea.value = ticketId;
                      textarea.focus();
                  }
              } else {
                  const option = e.target.closest('.ticket-option');
                  if (option) {
                      const ticketId = option.querySelector('.ticket-option-detail span').textContent.trim();
                      if (textarea) {
                          textarea.value = ticketId;
                          textarea.focus();
                      }
                  }
              }
          });
      }

      if (sendButton && textarea) {
        sendButton.addEventListener('click', () => {
            const message = textarea.value.trim();
            if (message) {
                // this.addMessageToCommunicationLog(message, 'outgoing');
                this.updateSelectedTicket(message);
                textarea.value = '';
            }
          });
      }
    }

    addMessageToCommunicationLog(message, type) {
        const container = document.querySelector('.communication-log');
        if (!container) return;
        const msg = this.createMessageContainer(`communication-message ${type}`, message.replace(/\n/g, '<br>'));
        msg.innerHTML = `<div class="message-content">${message.replace(/\n/g, '<br>')}</div>`;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    async updateSelectedTicket(ticketId) {
      try {
          const requestId = new URLSearchParams(window.location.search).get('requestId');
          if (!requestId) return this.addMessageToCommunicationLog('Error: Unable to determine request ID.', 'system');
  
          const requestData = (await axios.get(`https://sample-cd206-default-rtdb.firebaseio.com/travelRequests/${requestId}.json`)).data;
          if (!requestData?.ticketDetails?.optionTickets) return this.addMessageToCommunicationLog('Error: Ticket information not available.', 'system');
          if (!requestData.ticketDetails.optionTickets[ticketId]) return this.addMessageToCommunicationLog('Error: Selected ticket not found in available options.', 'system');
  
          const selectedTicket = { [ticketId]: requestData.ticketDetails.optionTickets[ticketId] };
          await axios.put(`https://sample-cd206-default-rtdb.firebaseio.com/travelRequests/${requestId}/ticketDetails/selectedTicket.json`, selectedTicket);
  
          this.addMessageToCommunicationLog(`Ticket ${ticketId} has been selected successfully.`, 'system');
  
          this.highlightSelectedTicket(ticketId);
  
          if (requestData.bookingDetails.status === 'approved') {
              await this.updateRequestStatus(requestId, 'ticketed');
              this.updateUIStatus('ticketed');
              this.updateRequestProgressRD('ticketed');
          }
          this.updateSendButtonState(document.getElementById('status').textContent);
  
      } catch (error) {
          this.handleError('Error updating selected ticket:', error, 'An error occurred while selecting the ticket. Please try again.');
      }
  }

    highlightSelectedTicket(ticketId) {
        document.querySelectorAll('.ticket-option').forEach(option => {
            const optionId = option.querySelector('.ticket-option-detail span').textContent.trim();
            option.classList.toggle('selected', optionId === ticketId);
            option.querySelector('.selected-indicator')?.remove();
            if (optionId === ticketId) option.innerHTML += '<div class="selected-indicator">✓ Selected</div>';
        });
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
        this.updateRequestProgressRD(requestData.bookingDetails.status);
        this.loadTicketOptions(requestId, requestData);
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

    handleError(message, error, displayMessage) {
        console.error(message, error);
        if (displayMessage) this.showErrorMessage(displayMessage);
    }

    showErrorMessage(message) {
      const errorContainer = this.createMessageContainer('error-message', message);
      document.body.insertAdjacentElement('afterbegin', errorContainer);
    }

    createMessageContainer(className, text) {
    const container = document.createElement('div');
        container.className = className;
        container.textContent = text;
        return container;
    }

    updateUIStatus(status) {
        const element = document.getElementById('status');
        if (element) {
            element.className = `status-${status.toLowerCase()}`;
            element.textContent = status;
        }
    }

    updateTotalRequestsCount(count) {
        const element = document.getElementById('total-requests');
        if (element) element.textContent = `Total ${count} requests`;
    }
}

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