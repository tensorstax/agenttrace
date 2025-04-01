"""
Setup script for the tensorscope package.
"""

from setuptools import setup

# Call setup with minimal configuration, 
# most settings are in pyproject.toml and/or setup.cfg
setup(
    package_dir={"": "src"},
    packages=["tensorscope"],
    include_package_data=True,
)