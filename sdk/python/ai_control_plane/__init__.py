"""
__init__.py — Public surface of the ai_control_plane Python package

This is the file that runs when anyone does:
    from ai_control_plane import ControlPlaneSDK

We deliberately keep the public API minimal:
  - ControlPlaneSDK  : the main class (track, get_config)
  - Middleware classes are imported separately from ai_control_plane.middleware
    to avoid pulling in framework-specific deps (Flask/FastAPI/Django) for users
    who only need one framework.

Version follows SemVer. Match this to pyproject.toml when releasing.
"""

from ai_control_plane.client import ControlPlaneSDK

__version__ = "1.0.1"

# What `from ai_control_plane import *` exports
__all__ = ["ControlPlaneSDK"]
