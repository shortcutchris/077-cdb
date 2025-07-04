{ pkgs }: {
  deps = [
    # Node.js 20 LTS
    pkgs.nodejs_20
    
    # Git for version control
    pkgs.git
    
    # For audio processing (voice recording)
    pkgs.ffmpeg
    
    # Build tools
    pkgs.gcc
    pkgs.gnumake
    
    # For native dependencies
    pkgs.python3
    
    # SSL certificates for HTTPS requests
    pkgs.cacert
  ];
  
  # Environment variables
  env = {
    # Set Node options for better performance
    NODE_OPTIONS = "--max-old-space-size=512";
  };
}