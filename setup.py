"""
Setup script for the agenttrace package.
"""

from setuptools import setup

# Call setup with minimal configuration, 
# most settings are in pyproject.toml and/or setup.cfg
setup(
    package_dir={"": "src"},
    packages=["agenttrace"],
    include_package_data=True,
)