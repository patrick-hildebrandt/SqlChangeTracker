<?php

$directory = __DIR__ . '/app/Models';
$files = scandir($directory);

foreach ($files as $file) {
    if ($file === '.' || $file === '..' || !str_ends_with($file, '.php')) {
        continue;
    }

    $content = file_get_contents($directory . '/' . $file);
    
    // Suche nach dem $table Property mit regulärem Ausdruck
    if (preg_match("/protected\s+\\\$table\s*=\s*['\"]([^'\"]+)['\"]/", $content, $matches)) {
        $tableName = $matches[1];
        echo sprintf("%-30s => %s\n", $file, $tableName);
    } else {
        echo sprintf("%-30s => (kein Tabellenname definiert)\n", $file);
    }
}