export interface Section {
    id: string;
    title: string;
    content: string[];
}

export interface EncryptedDataFile {
    encryptedContent: string;  // Base64 encoded encrypted data
    iv: string;               // Initialization vector
    createdAt: string;
    updatedAt: string;
}

export interface DecryptedData {
    sections: Section[];
    metadata: {
        lastModified: string;
        version: string;
    };
}