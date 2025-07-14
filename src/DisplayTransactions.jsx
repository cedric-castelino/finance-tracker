const typeImageMap = {
    Food: "https://cdn-icons-png.flaticon.com/512/1037/1037762.png",
    Subscriptions: "https://cdn-icons-png.flaticon.com/512/4730/4730517.png",
    Shopping: "https://cdn-icons-png.flaticon.com/512/3081/3081559.png",
    Transportation: "https://cdn-icons-png.flaticon.com/512/575/575780.png",
    "Going Out": "https://cdn-icons-png.flaticon.com/512/2397/2397297.png",
    Other: "https://cdn-icons-png.flaticon.com/512/12636/12636957.png",
    "Credit Repayment": "https://cdn-icons-png.flaticon.com/512/14674/14674802.png",
    Salary: "https://cdn-icons-png.flaticon.com/512/3732/3732667.png",
    "Youth Allowance": "https://cdn-icons-png.flaticon.com/512/13061/13061246.png"
};

const DisplayTransactions = ({ transaction, onNoteClick, show }) => {
    const imageSrc = typeImageMap[transaction.category];


    return (
        <ul className="list bg-base-100 rounded-box shadow-md mt-3">
            <li className={`list-row border ${transaction.transactionType === 'Income' ? 'border-green-500' : transaction.transactionType === 'Expense' && transaction.category === 'Credit Repayment' ? 'border-yellow-500' : 'border-red-500'}`}>
                <div>
                    <img className="size-10"
                        src={imageSrc}
                    />
                </div>
                <div>
                <div>{transaction.title}</div>
                <div className="text-xs uppercase font-semibold opacity-60">{transaction.source} - {transaction.date}</div>
                </div>
                <div className="flex items-center h-full">
                    <div className="text-lg font-semibold">${transaction.amount}</div>
                </div>
                {transaction.note !== '' && (
                    <button className="btn btn-square btn-ghost group" onClick={() => onNoteClick(transaction.note)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-gray-500 group-hover:text-blue-500 transition-colors duration-200">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                    </button>
                )}
                <button className="btn btn-square btn-ghost group">
                    <svg xmlns="http://www.w3.org/2000/svg"fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-gray-500 group-hover:text-red-500 transition-colors duration-200" onClick={() => show(transaction)}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>
                    </svg>
                </button>
            </li>
        </ul>
    )   
}

export default DisplayTransactions;