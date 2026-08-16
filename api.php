<?php
header('Content-Type: application/json');

 $jsonFile = 'products.json';
 $uploadDir = 'uploads/';

// Create uploads directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// 1. Handle Image Upload
if (!empty($_FILES)) {
    $file = $_FILES['image'];
    $fileName = time() . '_' . preg_replace('/\s+/', '_', basename($file['name']));
    $targetPath = $uploadDir . $fileName;
    
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($file['type'], $allowedTypes)) {
        echo json_encode(['success' => false, 'message' => 'Invalid file type.']);
        exit;
    }

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode(['success' => true, 'url' => $targetPath]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to move uploaded file. Check folder permissions.']);
    }
    exit;
}

// 2. Handle Saving Products JSON
 $json = file_get_contents('php://input');
 $data = json_decode($json, true);

if (isset($data['action']) && $data['action'] === 'save_products') {
    if (file_put_contents($jsonFile, json_encode($data['data'], JSON_PRETTY_PRINT))) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to write to products.json. Check file permissions.']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request.']);
?>
