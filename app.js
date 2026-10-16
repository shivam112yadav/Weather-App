/**
 * Live Weather App
 * A comprehensive weather application with current conditions and forecasts
 */

class WeatherApp {
  constructor() {
      // Configuration
      this.config = {
          apiKey: '15ee009ee14b3478a9650080c682ed2a',
          baseUrl: 'https://api.openweathermap.org/data/2.5',
          refreshInterval: 900000, // 15 minutes
          defaultCity: 'Delhi'
      };

      // State management
      this.state = {
          currentUnit: 'celsius',
          lastSearchedCity: '',
          currentWeatherData: null,
          refreshInterval: null,
          timeUpdateInterval: null
      };

      // DOM elements
      this.elements = {};
      
      // Initialize the app
      this.init();
  }

  /**
   * Initialize the application
   */
  init() {
      this.cacheDOMElements();
      this.bindEvents();
      this.startTimeUpdates();
      this.loadInitialWeather();
  }

  /**
   * Cache all DOM elements for performance
   */
  cacheDOMElements() {
      // Input and button elements
      this.elements.searchInput = document.getElementById('search-input');
      this.elements.searchBtn = document.getElementById('search-btn');
      this.elements.locationBtn = document.getElementById('location-btn');
      this.elements.refreshBtn = document.getElementById('refresh-btn');
      
      // Display containers
      this.elements.weatherDisplay = document.getElementById('weather-display');
      this.elements.loading = document.getElementById('loading');
      this.elements.errorMessage = document.getElementById('error-message');
      
      // Unit toggle buttons
      this.elements.celsiusBtn = document.getElementById('celsius-btn');
      this.elements.fahrenheitBtn = document.getElementById('fahrenheit-btn');
      
      // Weather information elements
      this.elements.locationEl = document.querySelector('#location span');
      this.elements.dateTimeEl = document.getElementById('date-time');
      this.elements.weatherIcon = document.getElementById('weather-icon');
      this.elements.temperatureEl = document.querySelector('#temperature .temp-value');
      this.elements.tempUnit = document.querySelector('.temp-unit');
      this.elements.weatherDesc = document.getElementById('weather-description');
      
      // Weather details
      this.elements.feelsLikeEl = document.getElementById('feels-like');
      this.elements.humidityEl = document.getElementById('humidity');
      this.elements.windSpeedEl = document.getElementById('wind-speed');
      this.elements.uvIndexEl = document.getElementById('uv-index');
      
      // Forecast and misc
      this.elements.forecastItems = document.getElementById('forecast-items');
      this.elements.lastUpdatedEl = document.getElementById('last-updated');
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
      // Search functionality
      this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
      this.elements.searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.handleSearch();
      });

      // Location and refresh
      this.elements.locationBtn.addEventListener('click', () => this.handleLocationRequest());
      this.elements.refreshBtn.addEventListener('click', () => this.handleRefresh());

      // Unit toggle
      this.elements.celsiusBtn.addEventListener('click', () => this.handleUnitChange('celsius'));
      this.elements.fahrenheitBtn.addEventListener('click', () => this.handleUnitChange('fahrenheit'));
  }

  /**
   * Start time update intervals
   */
  startTimeUpdates() {
      this.updateTime();
      this.state.timeUpdateInterval = setInterval(() => this.updateTime(), 1000);
  }

  /**
   * Load initial weather data
   */
  loadInitialWeather() {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  this.fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
              },
              () => {
                  this.fetchWeatherByCity(this.config.defaultCity);
              }
          );
      } else {
          this.fetchWeatherByCity(this.config.defaultCity);
      }
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle search button click or Enter key press
   */
  handleSearch() {
      const city = this.elements.searchInput.value.trim();
      if (city) {
          this.fetchWeatherByCity(city);
      }
  }

  /**
   * Handle location button click
   */
  handleLocationRequest() {
      if (!navigator.geolocation) {
          this.showError("Geolocation is not supported by your browser");
          return;
      }

      navigator.geolocation.getCurrentPosition(
          (position) => {
              this.fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
          },
          () => {
              this.showError("Please enable location access to use this feature");
          }
      );
  }

  /**
   * Handle refresh button click
   */
  handleRefresh() {
      if (this.state.lastSearchedCity) {
          this.fetchWeatherByCity(this.state.lastSearchedCity);
      } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  this.fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
              },
              () => {
                  this.showError("Could not refresh weather data");
              }
          );
      }
  }

  /**
   * Handle unit change (Celsius/Fahrenheit)
   */
  handleUnitChange(unit) {
      if (this.state.currentUnit !== unit) {
          this.toggleUnits(unit);
      }
  }

  // ==================== API METHODS ====================

  /**
   * Fetch weather data by city name
   */
  async fetchWeatherByCity(city) {
      this.showLoading();
      this.state.lastSearchedCity = city;

      try {
          const [currentData, forecastData] = await Promise.all([
              this.fetchCurrentWeather({ q: city }),
              this.fetchForecast({ q: city })
          ]);

          this.processWeatherData(currentData, forecastData);
      } catch (error) {
          this.showError(error.message || "Failed to fetch weather data");
      } finally {
          this.hideLoading();
      }
  }

  /**
   * Fetch weather data by coordinates
   */
  async fetchWeatherByCoords(lat, lon) {
      this.showLoading();

      try {
          const [currentData, forecastData] = await Promise.all([
              this.fetchCurrentWeather({ lat, lon }),
              this.fetchForecast({ lat, lon })
          ]);

          this.state.lastSearchedCity = currentData.name;
          this.processWeatherData(currentData, forecastData);
      } catch (error) {
          this.showError("Failed to fetch weather data");
      } finally {
          this.hideLoading();
      }
  }

  /**
   * Fetch current weather from API
   */
  async fetchCurrentWeather(params) {
      const url = this.buildApiUrl('weather', params);
      const response = await fetch(url);

      if (!response.ok) {
          throw new Error(response.status === 404 ? 'City not found' : 'API request failed');
      }

      return await response.json();
  }

  /**
   * Fetch forecast data from API
   */
  async fetchForecast(params) {
      const url = this.buildApiUrl('forecast', params);
      const response = await fetch(url);

      if (!response.ok) {
          throw new Error('Failed to fetch forecast data');
      }

      return await response.json();
  }

  /**
   * Build API URL with parameters
   */
  buildApiUrl(endpoint, params) {
      const baseUrl = `${this.config.baseUrl}/${endpoint}`;
      const urlParams = new URLSearchParams({
          ...params,
          units: 'metric',
          appid: this.config.apiKey
      });

      return `${baseUrl}?${urlParams.toString()}`;
  }

  // ==================== DATA PROCESSING ====================

  /**
   * Process and store weather data
   */
  processWeatherData(currentData, forecastData) {
      this.state.currentWeatherData = {
          current: currentData,
          forecast: forecastData
      };

      this.updateWeatherDisplay();
      this.hideError();
      this.updateLastUpdatedTime();
      this.startAutoRefresh();
  }

  /**
   * Update the main weather display
   */
  updateWeatherDisplay() {
      if (!this.state.currentWeatherData) return;

      const { current } = this.state.currentWeatherData;

      // Update location and basic info
      this.elements.locationEl.textContent = `${current.name}, ${current.sys.country}`;
      this.elements.weatherIcon.src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`;
      this.elements.weatherIcon.alt = current.weather[0].description;
      this.elements.weatherDesc.textContent = current.weather[0].description;

      // Update temperatures and details
      this.updateTemperatureDisplay();
      this.updateWeatherDetails();
      this.updateForecastDisplay();

      // Show the weather display
      this.elements.weatherDisplay.style.display = 'flex';
  }

  /**
   * Update temperature display based on current unit
   */
  updateTemperatureDisplay() {
      const { current } = this.state.currentWeatherData;
      const temp = current.main.temp;
      const feelsLike = current.main.feels_like;

      if (this.state.currentUnit === 'celsius') {
          this.elements.temperatureEl.textContent = Math.round(temp);
          this.elements.feelsLikeEl.textContent = `${Math.round(feelsLike)}°C`;
      } else {
          this.elements.temperatureEl.textContent = Math.round(this.celsiusToFahrenheit(temp));
          this.elements.feelsLikeEl.textContent = `${Math.round(this.celsiusToFahrenheit(feelsLike))}°F`;
      }

      this.elements.tempUnit.textContent = this.state.currentUnit === 'celsius' ? 'C' : 'F';
  }

  /**
   * Update weather details (humidity, wind, UV)
   */
  updateWeatherDetails() {
      const { current } = this.state.currentWeatherData;

      this.elements.humidityEl.textContent = `${current.main.humidity}%`;
      this.elements.windSpeedEl.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
      
      // Simulate UV index (not available in basic API)
      const uvIndex = Math.min(Math.floor(current.main.temp / 5), 10);
      this.elements.uvIndexEl.textContent = uvIndex;
  }

  /**
   * Update forecast display
   */
  updateForecastDisplay() {
      const { forecast } = this.state.currentWeatherData;
      
      // Clear previous forecast
      this.elements.forecastItems.innerHTML = '';
      
      // Group forecast data by day
      const dailyForecasts = this.groupForecastByDay(forecast.list);
      const days = Object.keys(dailyForecasts).slice(0, 6);

      days.forEach(dayKey => {
          const forecastItem = this.createForecastItem(dailyForecasts[dayKey]);
          this.elements.forecastItems.appendChild(forecastItem);
      });
  }

  /**
   * Group forecast data by day
   */
  groupForecastByDay(forecastList) {
      const dailyForecasts = {};

      forecastList.forEach(item => {
          const date = new Date(item.dt * 1000);
          const dayKey = date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'numeric', 
              day: 'numeric' 
          });

          if (!dailyForecasts[dayKey]) {
              dailyForecasts[dayKey] = {
                  date: date,
                  items: []
              };
          }

          dailyForecasts[dayKey].items.push(item);
      });

      return dailyForecasts;
  }

  /**
   * Create a forecast item element
   */
  createForecastItem(dayData) {
      const { date, items } = dayData;
      
      // Find midday forecast or use middle item
      const middayForecast = this.findMiddayForecast(items);
      
      const forecastItem = document.createElement('div');
      forecastItem.className = 'forecast-item';
      
      const temp = Math.round(middayForecast.main.temp);
      const displayTemp = this.state.currentUnit === 'celsius' 
          ? temp 
          : Math.round(this.celsiusToFahrenheit(temp));

      forecastItem.innerHTML = `
          <div class="forecast-day">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
          <div class="forecast-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          <img class="forecast-icon" src="https://openweathermap.org/img/wn/${middayForecast.weather[0].icon}.png" alt="${middayForecast.weather[0].description}">
          <div class="forecast-temp">${displayTemp}°</div>
          <div class="forecast-desc">${middayForecast.weather[0].description}</div>
      `;

      return forecastItem;
  }

  /**
   * Find the best forecast item for a day (preferring midday)
   */
  findMiddayForecast(items) {
      const middayForecast = items.find(item => {
          const hour = new Date(item.dt * 1000).getHours();
          return hour >= 11 && hour <= 14;
      });

      return middayForecast || items[Math.floor(items.length / 2)] || items[0];
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Convert Celsius to Fahrenheit
   */
  celsiusToFahrenheit(celsius) {
      return (celsius * 9/5) + 32;
  }

  /**
   * Convert Fahrenheit to Celsius
   */
  fahrenheitToCelsius(fahrenheit) {
      return (fahrenheit - 32) * 5/9;
  }

  /**
   * Toggle between Celsius and Fahrenheit
   */
  toggleUnits(unit) {
      this.state.currentUnit = unit;

      // Update UI buttons
      if (unit === 'celsius') {
          this.elements.celsiusBtn.classList.add('active');
          this.elements.fahrenheitBtn.classList.remove('active');
      } else {
          this.elements.celsiusBtn.classList.remove('active');
          this.elements.fahrenheitBtn.classList.add('active');
      }

      // Update temperature displays if data exists
      if (this.state.currentWeatherData) {
          this.updateTemperatureDisplay();
          this.updateForecastDisplay();
      }
  }

  /**
   * Update current time display
   */
  updateTime() {
      const now = new Date();
      this.elements.dateTimeEl.textContent = now.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
      });
  }

  /**
   * Update last updated timestamp
   */
  updateLastUpdatedTime() {
      const now = new Date();
      this.elements.lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
  }

  /**
   * Start auto-refresh interval
   */
  startAutoRefresh() {
      // Clear existing interval
      if (this.state.refreshInterval) {
          clearInterval(this.state.refreshInterval);
      }

      // Set new interval
      this.state.refreshInterval = setInterval(() => {
          this.handleRefresh();
      }, this.config.refreshInterval);
  }

  // ==================== UI STATE METHODS ====================

  /**
   * Show loading state
   */
  showLoading() {
      this.elements.loading.style.display = 'flex';
      this.elements.weatherDisplay.style.display = 'none';
      this.hideError();
  }

  /**
   * Hide loading state
   */
  hideLoading() {
      this.elements.loading.style.display = 'none';
  }

  /**
   * Show error message
   */
  showError(message) {
      this.elements.errorMessage.textContent = message;
      this.elements.errorMessage.style.display = 'block';
      this.elements.weatherDisplay.style.display = 'none';
  }

  /**
   * Hide error message
   */
  hideError() {
      this.elements.errorMessage.style.display = 'none';
  }

  // ==================== CLEANUP METHODS ====================

  /**
   * Destroy the app and clean up resources
   */
  destroy() {
      // Clear intervals
      if (this.state.refreshInterval) {
          clearInterval(this.state.refreshInterval);
      }
      
      if (this.state.timeUpdateInterval) {
          clearInterval(this.state.timeUpdateInterval);
      }

      // Remove event listeners (if needed for single-page apps)
      // This would require storing references to bound functions
  }
}

// ==================== APP INITIALIZATION ====================

/**
* Initialize the weather app when DOM is ready
*/
document.addEventListener('DOMContentLoaded', () => {
  const weatherApp = new WeatherApp();
  
  // Make app instance globally available for debugging (optional)
  window.weatherApp = weatherApp;
});