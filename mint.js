import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { cryptoUtils } from 'sotez';

const coverOptions = {
    quality: 0.9,
    maxWidth: 1024,
    maxHeight: 1024,
}

const thumbnailOptions = {
    quality: 0.9,
    maxWidth: 350,
    maxHeight: 350,
}

const objkt = 'KT1Hkg5qeNhfwpKW4fXvq7HGZB9z2EnmCCA9';
const Tezos = await getTezos();

async function getTezos() {
    const Tezos = new TezosToolkit('https://mainnet.smartpy.io/');
    let signer;
    if(!process.env.MNEMONIC || !process.env.SECRET)
        throw 'Neither MNEMONIC nor SECRET is set!';
    if(process.env.MNEMONIC) {
        const keys = await cryptoUtils.generateKeys(process.env.MNEMONIC);
        signer = new InMemorySigner(keys.sk);
    } else if(process.env.SECRET) {
        signer = new InMemorySigner(process.env.SECRET);
    }

    const walletAddress = await signer.publicKeyHash();

    console.log('Running for sender ' + walletAddress);

    Tezos.setProvider({signer});

    return Tezos;
}

const main = async() => {
    const tokenFile = '';
    const thumbnailFile = '';
    const files = [tokenFile, thumbnailFile];
    prepareDirectory('');
};

const mint = async(tz, amount, cid, royalties) => {
    await Tezos.wallet
        .at(objkt)
        .then((c) =>
            c.methods
                .mint_OBJKT(
                    tz,
                    parseFloat(amount),
                    `ipfs://${cid}`
                        .split('')
                        .reduce((hex, c) => hex + c.charCodeAt(0).toString(16).padStart(2, '0'), ''),
                    parseFloat(royalties) * 10,
                )
                .send({amount: 0}),
        )
        .then((op) =>
            op.confirmation(1).then(() => {
                console.log('Operation Hash', op.hash);
                console.log('Success');
            }),
        )
        .catch((err) => {
            console.log('Error', err);
        });
};


const handleMint = async () => {
    if (!acc) {
        // warning for sync
        setFeedback({
            visible: true,
            message: 'sync your wallet',
            progress: true,
            confirm: false,
        })

        await syncTaquito()

        setFeedback({
            visible: false,
        })
    } else {
        await setAccount()

        // check mime type
        if (ALLOWED_MIMETYPES.indexOf(file.mimeType) === -1) {
            // alert(
            //   `File format invalid. supported formats include: ${ALLOWED_FILETYPES_LABEL.toLocaleLowerCase()}`
            // )

            setFeedback({
                visible: true,
                message: `File format invalid. supported formats include: ${ALLOWED_FILETYPES_LABEL.toLocaleLowerCase()}`,
                progress: false,
                confirm: true,
                confirmCallback: () => {
                    setFeedback({ visible: false })
                },
            })

            return
        }

        // check file size
        const filesize = (file.file.size / 1024 / 1024).toFixed(4)
        if (filesize > MINT_FILESIZE) {
            // alert(
            //   `File too big (${filesize}). Limit is currently set at ${MINT_FILESIZE}MB`
            // )

            setFeedback({
                visible: true,
                message: `File too big (${filesize}). Limit is currently set at ${MINT_FILESIZE}MB`,
                progress: false,
                confirm: true,
                confirmCallback: () => {
                    setFeedback({ visible: false })
                },
            })

            return
        }

        // file about to be minted, change to the mint screen

        setStep(2)

        setFeedback({
            visible: true,
            message: 'preparing OBJKT',
            progress: true,
            confirm: false,
        })

        // upload file(s)
        let nftCid
        if (
            [MIMETYPE.ZIP, MIMETYPE.ZIP1, MIMETYPE.ZIP2].includes(file.mimeType)
        ) {
            const files = await prepareFilesFromZIP(file.buffer)

            nftCid = await prepareDirectory({
                name: title,
                description,
                tags,
                address: acc.address,
                files,
                cover,
                thumbnail,
                generateDisplayUri: GENERATE_DISPLAY_AND_THUMBNAIL,
            })
        } else {
            // process all other files
            nftCid = await prepareFile({
                name: title,
                description,
                tags,
                address: acc.address,
                buffer: file.buffer,
                mimeType: file.mimeType,
                cover,
                thumbnail,
                generateDisplayUri: GENERATE_DISPLAY_AND_THUMBNAIL,
            })
        }

        mint(getAuth(), amount, nftCid.path, royalties)
    }
}

const handlePreview = () => {
    setStep(1)
}

const handleFileUpload = async (props) => {
    setFile(props)

    if (GENERATE_DISPLAY_AND_THUMBNAIL) {
        if (props.mimeType.indexOf('image') === 0) {
            setNeedsCover(false)
            await generateCoverAndThumbnail(props)
        } else {
            setNeedsCover(true)
        }
    }
}

const generateCompressedImage = async (props, options) => {
    const blob = await compressImage(props.file, options)
    const mimeType = blob.type
    const buffer = await blob.arrayBuffer()
    const reader = await blobToDataURL(blob)
    return { mimeType, buffer, reader }
}

const blobToDataURL = async (blob) => {
    return new Promise((resolve, reject) => {
        let reader = new FileReader()
        reader.onerror = reject
        reader.onload = (e) => resolve(reader.result)
        reader.readAsDataURL(blob)
    })
}

const handleCoverUpload = async (props) => await generateCoverAndThumbnail(props)

const generateCoverAndThumbnail = async () => {
    const cover = await generateCompressedImage(coverOptions)

    const thumb = await generateCompressedImage(thumbnailOptions)

    return {cover, thumb}
}
