"""
Basic tests for the agenttrace package.
"""

import unittest
from agenttrace import TraceManager, TracerEval

class TestTraceManager(unittest.TestCase):
    """Test the TraceManager class."""
    
    def test_singleton(self):
        """Test that TraceManager is a singleton."""
        tm1 = TraceManager()
        tm2 = TraceManager()
        self.assertIs(tm1, tm2)
        
    def test_initialization(self):
        """Test that TraceManager initializes properly."""
        tm = TraceManager()
        self.assertTrue(hasattr(tm, 'traces'))
        self.assertTrue(hasattr(tm, 'db_path'))

if __name__ == '__main__':
    unittest.main() 