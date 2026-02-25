#!/usr/bin/env python3
"""
Backend API Testing Suite for Flux Productivity OS
Tests all backend API endpoints for functionality and data persistence
"""

import requests
import json
import sys
from datetime import datetime

# Use the public backend URL from frontend configuration
BACKEND_URL = "https://fluxi-rebuild.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })
        self.test_results = []
        
    def log_result(self, test_name, success, details=""):
        """Log test results for reporting"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} {test_name}: {details}")
        
    def test_root_endpoint(self):
        """Test GET /api/ endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Hello World":
                    self.log_result("Root Endpoint", True, "Returns correct message")
                    return True
                else:
                    self.log_result("Root Endpoint", False, f"Incorrect response: {data}")
                    return False
            else:
                self.log_result("Root Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Root Endpoint", False, f"Request failed: {str(e)}")
            return False
    
    def test_create_status_check(self):
        """Test POST /api/status endpoint"""
        try:
            test_payload = {
                "client_name": "FluxTestClient2024"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/status",
                json=test_payload
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ["id", "client_name", "timestamp"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Create Status Check", False, f"Missing fields: {missing_fields}")
                    return False, None
                
                if data["client_name"] != test_payload["client_name"]:
                    self.log_result("Create Status Check", False, "Client name mismatch")
                    return False, None
                    
                # Validate UUID format
                try:
                    import uuid
                    uuid.UUID(data["id"])
                except ValueError:
                    self.log_result("Create Status Check", False, "Invalid UUID format")
                    return False, None
                
                self.log_result("Create Status Check", True, f"Created status check with ID: {data['id']}")
                return True, data["id"]
                
            else:
                self.log_result("Create Status Check", False, f"HTTP {response.status_code}: {response.text}")
                return False, None
                
        except Exception as e:
            self.log_result("Create Status Check", False, f"Request failed: {str(e)}")
            return False, None
    
    def test_get_status_checks(self, expected_id=None):
        """Test GET /api/status endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/status")
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_result("Get Status Checks", False, "Response is not a list")
                    return False
                
                # If we have an expected ID, verify it's in the list
                if expected_id:
                    found_entry = False
                    for item in data:
                        if item.get("id") == expected_id:
                            found_entry = True
                            # Validate structure of found entry
                            required_fields = ["id", "client_name", "timestamp"]
                            missing_fields = [field for field in required_fields if field not in item]
                            if missing_fields:
                                self.log_result("Get Status Checks", False, f"Entry missing fields: {missing_fields}")
                                return False
                            break
                    
                    if not found_entry:
                        self.log_result("Get Status Checks", False, f"Created entry with ID {expected_id} not found in list")
                        return False
                
                self.log_result("Get Status Checks", True, f"Retrieved {len(data)} status checks")
                return True
                
            else:
                self.log_result("Get Status Checks", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Status Checks", False, f"Request failed: {str(e)}")
            return False
    
    def test_data_persistence(self):
        """Test that data persists between requests"""
        try:
            # Create a status check
            create_success, created_id = self.test_create_status_check()
            if not create_success:
                return False
            
            # Retrieve all status checks and verify our entry exists
            get_success = self.test_get_status_checks(created_id)
            if not get_success:
                return False
                
            self.log_result("Data Persistence", True, "Created data persists in MongoDB")
            return True
            
        except Exception as e:
            self.log_result("Data Persistence", False, f"Test failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print(f"🚀 Starting Backend API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test 1: Root endpoint
        root_success = self.test_root_endpoint()
        
        # Test 2: Create status check
        create_success, created_id = self.test_create_status_check()
        
        # Test 3: Get status checks
        get_success = self.test_get_status_checks()
        
        # Test 4: Data persistence (combined test)
        persistence_success = self.test_data_persistence()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY:")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        overall_success = failed_tests == 0
        status = "✅ ALL TESTS PASSED" if overall_success else "❌ SOME TESTS FAILED"
        print(f"\n{status}")
        
        return overall_success

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()